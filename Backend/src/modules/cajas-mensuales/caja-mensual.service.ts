import { CajaMensual } from './caja-mensual.entity';
import { CajaMensualRepository } from './caja-mensual.repository';
import { AppError } from '../../common/errors/app-error';

/**
 * Capa de Lógica de Negocio: CajaMensualService
 * Gestiona el catálogo de cajas y la lógica de combinaciones óptimas (componente de IA / personalización).
 */
export class CajaMensualService {
  constructor(private readonly cajaMensualRepository: CajaMensualRepository) {}

  public async listarCajas(): Promise<CajaMensual[]> {
    return this.cajaMensualRepository.findAll();
  }

  public async obtenerPorId(id: string): Promise<CajaMensual> {
    const caja = await this.cajaMensualRepository.findById(id);
    if (!caja) {
      throw new AppError(`Caja mensual con ID ${id} no encontrada`, 404);
    }
    return caja;
  }

  public async crearCaja(data: Partial<CajaMensual>): Promise<CajaMensual> {
    if (!data.nombre || !data.categoria || !data.mes || !data.anio) {
      throw new AppError('Faltan campos obligatorios para dar de alta la caja mensual', 400);
    }
    return this.cajaMensualRepository.create(data);
  }

  public async armarCajaPersonalizada(
    _suscriptorId: string,
    _preferencias: unknown
  ): Promise<Partial<CajaMensual>> {
    // TODO: Conectar con el componente de IA / recomendador personalizado
    // según el perfil organoléptico del suscriptor y el inventario disponible.
    return {
      nombre: 'Caja Selección Personalizada (Esqueleto)',
      items: [],
      disponible: true,
    };
  }
}
