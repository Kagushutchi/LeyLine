import { getDataSource } from '../../../../config/database.config';
import { envConfig } from '../../../../config/env.config';
import { AppError } from '../../../../common/errors/app-error';
import { Suscriptor } from '../../../suscriptores/infrastructure/suscriptor.entity';
import { Producto } from '../../../productos/infrastructure/producto.entity';
import { CajaMensual } from '../../infrastructure/caja-mensual.entity';
import { CajaMensualRepository } from '../../infrastructure/caja-mensual-repository';
import { IsNull } from 'typeorm';

/** Respuesta enriquecida que devuelve el recomendador */
export interface RecommendationResult {
  cajaRecomendada: CajaMensual;
  explicacion: string;
  puntajeMatchPorcentaje: number;
  modeloIA: string;
}

/**
 * Caso de uso: RecommendCajaMensual
 *
 * Implementa un recomendador basado en contenido utilizando la API de Google Gemini (AI Studio).
 * Toma las preferencias organolépticas del suscriptor y el catálogo de cajas mensuales con sus
 * composiciones y perfiles de notas, y delega el ranking/selección a Gemini.
 *
 * Endpoint REST: POST /api/cajas-mensuales/recomendar
 * Body: { suscriptorId: string, preferencias?: object }
 */
export default class RecommendCajaMensual {
  private cajasRepo: CajaMensualRepository;

  constructor() {
    this.cajasRepo = new CajaMensualRepository();
  }

  async execute(suscriptorId: string, preferenciasOverride?: any): Promise<RecommendationResult> {
    if (!suscriptorId) {
      throw new AppError('El ID del suscriptor es requerido para generar la recomendación personalizada', 400);
    }

    const apiKey = envConfig.ai.googleApiKey;
    if (!apiKey) {
      throw new AppError(
        'El recomendador de IA no está configurado. Agregá GOOGLE_AI_API_KEY en el archivo .env del backend.',
        503,
      );
    }

    // 1. Cargar suscriptor con sus preferencias
    const suscriptor = await this.getSuscriptor(suscriptorId);
    if (!suscriptor) {
      throw new AppError(`Suscriptor con ID "${suscriptorId}" no encontrado`, 404);
    }

    // Las preferencias pueden venir del body (override) o del perfil almacenado
    const preferencias = preferenciasOverride ?? suscriptor.preferenciasOrganolepticas ?? {};

    // 2. Cargar cajas disponibles con sus composiciones y productos
    const cajas = await this.cajasRepo.findAll(suscriptor.tenantId);
    const cajasDisponibles = cajas.filter(c => c.disponible);

    if (cajasDisponibles.length === 0) {
      throw new AppError('No hay cajas mensuales disponibles para recomendar en este momento', 404);
    }

    // 3. Cargar productos adicionales del mismo tenant para contexto enriquecido
    const productos = await this.getProductos(suscriptor.tenantId);

    // 4. Construir el prompt para Gemini
    const prompt = this.buildPrompt(suscriptor, preferencias, cajasDisponibles, productos);

    // 5. Llamar a la API de Gemini
    const respuestaIA = await this.callGemini(prompt, apiKey);

    // 6. Parsear la respuesta JSON de Gemini
    const parsed = this.parseGeminiResponse(respuestaIA);

    // 7. Buscar la caja recomendada por ID
    const cajaElegida = cajasDisponibles.find(c => c.id === parsed.cajaId)
      ?? cajasDisponibles[0]; // fallback: primera disponible

    return {
      cajaRecomendada: cajaElegida,
      explicacion: parsed.explicacion,
      puntajeMatchPorcentaje: parsed.puntajeMatchPorcentaje ?? 0,
      modeloIA: envConfig.ai.geminiModel,
    };
  }

  // ─── Helpers privados ───────────────────────────────────────────────────────

  private async getSuscriptor(id: string): Promise<Suscriptor | null> {
    const repo = getDataSource().getRepository(Suscriptor);
    return repo.findOne({ where: { id, deletedAt: IsNull() } });
  }

  private async getProductos(tenantId?: string): Promise<Producto[]> {
    const repo = getDataSource().getRepository(Producto);
    const where: any = { activo: true, deletedAt: IsNull() };
    if (tenantId) where.tenantId = tenantId;
    return repo.find({ where });
  }

  /**
   * Construye el prompt que se envía a Gemini.
   * Incluye: perfil del suscriptor, cajas disponibles con composiciones y perfiles de notas.
   */
  private buildPrompt(
    suscriptor: Suscriptor,
    preferencias: any,
    cajas: CajaMensual[],
    productos: Producto[],
  ): string {
    const perfilSuscriptor = {
      nombre: `${suscriptor.nombre} ${suscriptor.apellido ?? ''}`.trim(),
      preferencias: {
        categoria: preferencias.categoria ?? 'no especificada',
        perfilSabor: preferencias.perfilSabor ?? [],
        intensidad: preferencias.intensidad ?? 'no especificada',
        alergiasRestricciones: preferencias.alergiasRestricciones ?? [],
        notasAdicionales: preferencias.notasAdicionales ?? '',
      },
    };

    // Mapear productos por ID para enriquecer composiciones
    const productoMap = new Map(productos.map(p => [p.id, p]));

    const cajasParaPrompt = cajas.map(caja => {
      const composicionDetallada = (caja.composiciones ?? []).map(comp => {
        const prod = productoMap.get(comp.productoId) ?? comp.producto;
        return {
          nombre: prod?.nombre ?? 'Producto',
          categoria: prod?.categoria ?? caja.categoria,
          tipo: (prod as any)?.tipo ?? '',
          perfilNotas: prod?.perfilNotas ?? [],
          alergenosRestricciones: prod?.alergenosRestricciones ?? [],
        };
      });

      return {
        id: caja.id,
        nombre: caja.nombre,
        categoria: caja.categoria,
        descripcion: caja.descripcion ?? '',
        precioBase: caja.precioBase,
        mes: caja.mes,
        anio: caja.anio,
        composicion: composicionDetallada,
      };
    });

    return `Eres un sommelier experto y curador de clubes de suscripción premium (vinos, cafés y cervezas artesanales).

Tu tarea es recomendar la MEJOR caja mensual para el siguiente suscriptor, basándote estrictamente en sus preferencias organolépticas y las cajas disponibles en el catálogo.

## Perfil del suscriptor
${JSON.stringify(perfilSuscriptor, null, 2)}

## Cajas mensuales disponibles en el catálogo
${JSON.stringify(cajasParaPrompt, null, 2)}

## Instrucciones
1. Analizá las preferencias del suscriptor (categoría, perfil de sabor, intensidad, alergias/restricciones).
2. Comparalas con la composición de cada caja y los perfiles de notas de sus productos.
3. Elegí la caja que mejor coincida. Si hay restricciones/alergias, priorizá evitarlas.
4. Calculá un puntaje de coincidencia del 0 al 100.
5. Respondé ÚNICAMENTE con un objeto JSON válido (sin markdown, sin texto extra) con esta estructura exacta:

{
  "cajaId": "<id de la caja recomendada>",
  "cajaNombre": "<nombre de la caja>",
  "puntajeMatchPorcentaje": <número 0-100>,
  "explicacion": "<explicación personalizada en español de por qué esta caja es perfecta para el suscriptor, mencionando los productos específicos y cómo se alinean con sus preferencias>"
}`;
  }

  /**
   * Realiza la llamada HTTP a la API de Google Gemini (AI Studio).
   * Usa fetch nativo de Node 18+.
   */
  private async callGemini(prompt: string, apiKey: string): Promise<string> {
    const model = envConfig.ai.geminiModel;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const body = {
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.3,       // Baja temperatura para respuestas consistentes y precisas
        maxOutputTokens: 1024,
        responseMimeType: 'application/json',
      },
    };

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch (err: any) {
      throw new AppError(`Error de red al contactar la API de Gemini: ${err.message}`, 503);
    }

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      throw new AppError(
        `La API de Gemini respondió con error ${response.status}: ${errorBody.slice(0, 200)}`,
        502,
      );
    }

    const data = await response.json() as any;

    // Extraer el texto generado de la respuesta de Gemini
    const text: string | undefined =
      data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new AppError('La API de Gemini devolvió una respuesta vacía o inesperada', 502);
    }

    return text;
  }

  /**
   * Parsea el JSON devuelto por Gemini.
   * Gemini puede envolver el JSON en bloques de código markdown; los limpia.
   */
  private parseGeminiResponse(raw: string): {
    cajaId: string;
    cajaNombre: string;
    puntajeMatchPorcentaje: number;
    explicacion: string;
  } {
    // Limpiar posibles bloques ```json ... ``` que Gemini agrega a veces
    const cleaned = raw
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();

    try {
      return JSON.parse(cleaned);
    } catch {
      throw new AppError(
        `La IA devolvió una respuesta que no pudo parsearse como JSON. Respuesta recibida: "${cleaned.slice(0, 300)}"`,
        502,
      );
    }
  }
}
