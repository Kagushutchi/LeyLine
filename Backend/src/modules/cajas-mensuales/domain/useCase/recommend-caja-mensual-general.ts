import { AppError } from '../../../../common/errors/app-error';
import { envConfig } from '../../../../config/env.config';
import { Producto } from '../../../productos/infrastructure/producto.entity';
import { ProductoRepository } from '../../../productos/infrastructure/producto-repository';
import { Suscriptor } from '../../../suscriptores/infrastructure/suscriptor.entity';
import { SuscriptorRepository } from '../../../suscriptores/infrastructure/suscriptor-repository';
import { Suscripcion } from '../../../suscripciones/infrastructure/suscripcion.entity';
import { SuscripcionRepository } from '../../../suscripciones/infrastructure/suscripcion-repository';
import { DeepSeekRecommendationClient } from '../../client/deepseek-recommendation-client';
import { RecomendacionCajaMensual, armarRecomendacion, construirCatalogoResumido } from './recomendacion.shared';

export default class RecommendCajaMensualGeneral {
  private readonly suscriptorRepository = new SuscriptorRepository();
  private readonly suscripcionRepository = new SuscripcionRepository();
  private readonly productoRepository = new ProductoRepository();
  private readonly clienteIA = new DeepSeekRecommendationClient();

  async execute(tenantId?: string, apiKey?: string): Promise<RecomendacionCajaMensual> {
    const clave = apiKey || envConfig.deepseek.apiKey;
    if (!clave) {
      throw new AppError(
        'Para generar una recomendación con IA necesitás una API key de DeepSeek. Configurá DEEPSEEK_API_KEY en el entorno o enviá "apiKey" en la solicitud (solo para pruebas).',
        400
      );
    }

    const suscriptores = await this.suscriptorRepository.findAll(tenantId);
    const suscripciones = await this.suscripcionRepository.findAll(tenantId);

    if (suscriptores.length === 0 && suscripciones.length === 0) {
      throw new AppError('No hay suscriptores ni suscripciones para generar una recomendación general', 404);
    }

    const resumen = this.resumirDemanda(suscriptores, suscripciones);
    const categoria = resumen.categoriaPrincipal;
    const catalogo = (await this.productoRepository.findAll(tenantId)).filter(
      (producto) => producto.activo && producto.categoria === categoria
    );

    if (catalogo.length === 0) {
      throw new AppError(`No hay productos activos para la categoría ${categoria}`, 404);
    }

    const sugerencia = await this.clienteIA.generarRecomendacion(
      this.construirPrompt(resumen, catalogo),
      clave
    );

    return armarRecomendacion(sugerencia, catalogo, categoria);
  }

  private resumirDemanda(suscriptores: Suscriptor[], suscripciones: Suscripcion[]) {
    const categorias = new Map<string, number>();
    const perfilSabor = new Map<string, number>();
    const alergias = new Set<string>();

    const sumarCategoria = (categoria?: string) => {
      if (!categoria) return;
      categorias.set(categoria, (categorias.get(categoria) || 0) + 1);
    };

    for (const suscriptor of suscriptores) {
      const preferencias = suscriptor.preferenciasOrganolepticas;
      sumarCategoria(preferencias?.categoria);
      for (const nota of preferencias?.perfilSabor || []) {
        perfilSabor.set(nota, (perfilSabor.get(nota) || 0) + 1);
      }
      for (const restriccion of preferencias?.alergiasRestricciones || []) {
        alergias.add(restriccion);
      }
    }

    for (const suscripcion of suscripciones) {
      if (suscripcion.estado !== 'cancelada') {
        sumarCategoria(suscripcion.categoria);
      }
    }

    const categoriaPrincipal =
      [...categorias.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || 'vinos';

    return {
      totalSuscriptores: suscriptores.length,
      totalSuscripcionesActivas: suscripciones.filter((s) => s.estado !== 'cancelada').length,
      categoriaPrincipal,
      categoriasDemandadas: Object.fromEntries(categorias),
      perfilSaborPopular: [...perfilSabor.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([nota, cantidad]) => ({ nota, cantidad })),
      alergiasRestricciones: [...alergias],
    };
  }

  private construirPrompt(resumen: Record<string, unknown>, catalogo: Producto[]): string {
    return JSON.stringify({
      tarea: 'Armá una caja mensual que satisfaga la demanda general de todos los suscriptores del club.',
      resumenDelClub: resumen,
      catalogoDisponible: construirCatalogoResumido(catalogo),
      respuestaEsperada: {
        nombre: 'string con un nombre atractivo para la caja',
        descripcion: 'string breve explicando por qué se eligieron esos productos',
        composiciones: [
          {
            productoId: 'id exacto del catálogo',
            cantidad: 'número entero entre 1 y 3',
          },
        ],
      },
      reglas: [
        'Usá solo productos del catálogo, con su productoId exacto.',
        'Priorizá la categoría y los perfiles de sabor más demandados del resumen del club.',
        'Evitá productos que tengan restricciones listadas en el resumen.',
      ],
    });
  }
}
