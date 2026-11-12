import axios from 'axios';
import { AppError } from '../../../common/errors/app-error';
import { logger } from '../../../common/utils/logger';
import { envConfig } from '../../../config/env.config';

export interface ComposicionSugerida {
  productoId: string;
  cantidad: number;
}

export interface RecomendacionSugerida {
  nombre: string;
  descripcion: string;
  composiciones: ComposicionSugerida[];
}

interface DeepSeekChatResponse {
  choices: Array<{ message: { content: string } }>;
}

export class DeepSeekRecommendationClient {
  async generarJson<T>(prompt: string, apiKey: string): Promise<T> {
    try {
      const respuesta = await axios.post<DeepSeekChatResponse>(
        `${envConfig.deepseek.baseUrl}/chat/completions`,
        {
          model: envConfig.deepseek.model,
          messages: [
            {
              role: 'system',
              content:
                'Sos el sommelier curador de un club de vinos, cafés y cervezas artesanales. Respondé únicamente con JSON válido, sin markdown ni texto adicional.',
            },
            { role: 'user', content: prompt },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.4,
        },
        {
          headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          timeout: 30000,
        }
      );

      const contenido = respuesta.data.choices?.[0]?.message?.content;
      if (!contenido) {
        throw new AppError('El modelo no devolvió contenido en la respuesta', 502);
      }

      return this.parsearJson<T>(contenido);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        throw new AppError('La API key de DeepSeek no es válida. Revisala y volvé a intentarlo.', 401);
      }
      if (error instanceof AppError) {
        throw error;
      }
      logger.error(`Error al consultar DeepSeek: ${error instanceof Error ? error.message : String(error)}`);
      throw new AppError('No se pudo generar la recomendación con el modelo de IA', 502);
    }
  }

  async generarRecomendacion(prompt: string, apiKey: string): Promise<RecomendacionSugerida> {
    const recomendacion = await this.generarJson<RecomendacionSugerida>(prompt, apiKey);
    if (!Array.isArray(recomendacion.composiciones)) {
      throw new AppError('El modelo devolvió una estructura inválida', 502);
    }
    return recomendacion;
  }

  private parsearJson<T>(contenido: string): T {
    const sinMarcas = contenido.replace(/```json|```/g, '').trim();
    return JSON.parse(sinMarcas) as T;
  }
}
