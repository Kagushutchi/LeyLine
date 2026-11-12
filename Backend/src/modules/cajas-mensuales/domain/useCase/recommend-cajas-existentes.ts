import { AppError } from '../../../../common/errors/app-error';
import { envConfig } from '../../../../config/env.config';
import { SuscriptorRepository } from '../../../suscriptores/infrastructure/suscriptor-repository';
import { DeepSeekRecommendationClient } from '../../client/deepseek-recommendation-client';
import { CajaMensual } from '../../infrastructure/caja-mensual.entity';
import { CajaMensualRepository } from '../../infrastructure/caja-mensual-repository';

export interface CajaRecomendada {
  cajaMensualId: string;
  motivo: string;
}

interface RespuestaRecomendacion {
  recomendaciones: CajaRecomendada[];
}

export default class RecommendCajasExistentes {
  private readonly suscriptorRepository = new SuscriptorRepository();
  private readonly cajaRepository = new CajaMensualRepository();
  private readonly clienteIA = new DeepSeekRecommendationClient();

  async execute(suscriptorId: string, apiKey?: string): Promise<CajaRecomendada[]> {
    const clave = apiKey || envConfig.deepseek.apiKey;
    if (!clave) {
      throw new AppError(
        'Para recomendar cajas con IA necesitás una API key de DeepSeek. Configurá DEEPSEEK_API_KEY en el entorno o enviá "apiKey" en la solicitud (solo para pruebas).',
        400
      );
    }

    const suscriptor = await this.suscriptorRepository.findOneById(suscriptorId);
    if (!suscriptor) {
      throw new AppError('Suscriptor no encontrado', 404);
    }

    const cajasDisponibles = (await this.cajaRepository.findAll()).filter((caja) => caja.disponible);
    if (cajasDisponibles.length === 0) {
      throw new AppError('No hay cajas mensuales disponibles para recomendar', 404);
    }

    const respuesta = await this.clienteIA.generarJson<RespuestaRecomendacion>(
      this.construirPrompt(suscriptor.preferenciasOrganolepticas || {}, cajasDisponibles),
      clave
    );

    return this.validarRecomendaciones(respuesta.recomendaciones || [], cajasDisponibles);
  }

  private construirPrompt(preferencias: Record<string, unknown>, cajas: CajaMensual[]): string {
    const cajasResumidas = cajas.map((caja) => ({
      cajaMensualId: caja.id,
      nombre: caja.nombre,
      categoria: caja.categoria,
      descripcion: caja.descripcion,
      precioBase: Number(caja.precioBase) || 0,
      notasDeCata: [
        ...new Set(
          (caja.composiciones || []).flatMap((composicion) => composicion.producto?.perfilNotas || [])
        ),
      ],
    }));

    return JSON.stringify({
      tarea: 'Seleccioná las cajas mensuales existentes que mejor se adapten a las preferencias del suscriptor.',
      preferenciasDelSuscriptor: preferencias,
      cajasDisponibles: cajasResumidas,
      respuestaEsperada: {
        recomendaciones: [
          {
            cajaMensualId: 'id exacto de la caja',
            motivo: 'string breve explicando por qué se recomienda',
          },
        ],
      },
      reglas: [
        'Elegí entre 1 y 4 cajas, ordenadas de mayor a menor afinidad.',
        'Usá el cajaMensualId exacto de la lista.',
        'Priorizá la categoría y las notas de cata que coincidan con el perfil del suscriptor.',
        'Respetá las alergias y restricciones del suscriptor.',
      ],
    });
  }

  private validarRecomendaciones(recomendaciones: CajaRecomendada[], cajas: CajaMensual[]): CajaRecomendada[] {
    const idsValidos = new Set(cajas.map((caja) => caja.id));
    const idsVistos = new Set<string>();
    const resultado: CajaRecomendada[] = [];

    for (const recomendacion of recomendaciones) {
      if (!recomendacion?.cajaMensualId || !idsValidos.has(recomendacion.cajaMensualId)) continue;
      if (idsVistos.has(recomendacion.cajaMensualId)) continue;
      idsVistos.add(recomendacion.cajaMensualId);
      resultado.push({
        cajaMensualId: recomendacion.cajaMensualId,
        motivo: recomendacion.motivo || '',
      });
    }

    return resultado;
  }
}
