import { AppError } from '../../../../common/errors/app-error';
import { Producto } from '../../../productos/infrastructure/producto.entity';
import { ProductoRepository } from '../../../productos/infrastructure/producto-repository';
import { SuscriptorRepository } from '../../../suscriptores/infrastructure/suscriptor-repository';
import { DeepSeekRecommendationClient } from '../../client/deepseek-recommendation-client';
import { RecomendacionCajaMensual, armarRecomendacion, construirCatalogoResumido, obtenerApiKey } from './recomendacion.shared';

export default class RecommendCajaMensual {
  private readonly suscriptorRepository = new SuscriptorRepository();
  private readonly productoRepository = new ProductoRepository();
  private readonly clienteIA = new DeepSeekRecommendationClient();

  async execute(
    suscriptorId: string,
    preferencias?: Record<string, unknown>
  ): Promise<RecomendacionCajaMensual> {
    const clave = obtenerApiKey();

    const suscriptor = await this.suscriptorRepository.findOneById(suscriptorId);
    if (!suscriptor) {
      throw new AppError('Suscriptor no encontrado', 404);
    }

    const preferenciasEfectivas = {
      ...(suscriptor.preferenciasOrganolepticas || {}),
      ...(preferencias || {}),
    };

    const categoria = String(preferenciasEfectivas.categoria || 'vinos');
    const catalogo = (await this.productoRepository.findAll(suscriptor.tenantId)).filter(
      (producto) => producto.activo && producto.categoria === categoria
    );

    if (catalogo.length === 0) {
      throw new AppError(`No hay productos activos para la categoría ${categoria}`, 404);
    }

    const sugerencia = await this.clienteIA.generarRecomendacion(
      this.construirPrompt(preferenciasEfectivas, catalogo),
      clave
    );

    return armarRecomendacion(sugerencia, catalogo, categoria);
  }

  private construirPrompt(preferencias: Record<string, unknown>, catalogo: Producto[]): string {
    return JSON.stringify({
      tarea: 'Seleccioná entre 3 y 5 productos para armar una caja mensual personalizada para el suscriptor.',
      preferenciasDelSuscriptor: preferencias,
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
        'Respetá las alergias y restricciones del suscriptor.',
        'Priorizá productos cuyas notas de cata coincidan con el perfil de sabor del suscriptor.',
      ],
    });
  }
}
