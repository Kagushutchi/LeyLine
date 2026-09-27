import { Suscripcion } from './suscripcion.entity';
import { SuscripcionRepository } from './suscripcion.repository';
import { AppError } from '../../common/errors/app-error';

/**
 * Capa de Lógica de Negocio: SuscripcionService
 * Gestiona ciclo de vida de membresías y pedidos recurrentes.
 */
export class SuscripcionService {
  constructor(private readonly suscripcionRepository: SuscripcionRepository) {}

  public async listarSuscripciones(): Promise<Suscripcion[]> {
    return this.suscripcionRepository.findAll();
  }

  public async obtenerPorId(id: string): Promise<Suscripcion> {
    const suscripcion = await this.suscripcionRepository.findById(id);
    if (!suscripcion) {
      throw new AppError(`Suscripción con ID ${id} no encontrada`, 404);
    }
    return suscripcion;
  }

  public async crearSuscripcion(data: Partial<Suscripcion>): Promise<Suscripcion> {
    // TODO: Validar existencia del cliente y verificar plan de facturación
    if (!data.suscriptorId || !data.categoria) {
      throw new AppError('suscriptorId y categoria son requeridos', 400);
    }
    return this.suscripcionRepository.create(data);
  }

  public async pausarSuscripcion(id: string): Promise<Suscripcion> {
    const suscripcion = await this.obtenerPorId(id);
    if (suscripcion.estado !== 'activa') {
      throw new AppError(`Solo se pueden pausar suscripciones activas (estado actual: ${suscripcion.estado})`, 400);
    }
    const updated = await this.suscripcionRepository.update(id, { estado: 'pausada' });
    return updated!;
  }

  public async cancelarSuscripcion(id: string): Promise<Suscripcion> {
    const suscripcion = await this.obtenerPorId(id);
    if (suscripcion.estado === 'cancelada') {
      throw new AppError('La suscripción ya se encuentra cancelada', 400);
    }
    const updated = await this.suscripcionRepository.update(id, { estado: 'cancelada' });
    return updated!;
  }
}
