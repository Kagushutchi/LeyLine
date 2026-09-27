import { Suscriptor } from './suscriptor.entity';
import { SuscriptorRepository } from './suscriptor.repository';
import { AppError } from '../../common/errors/app-error';

/**
 * Capa de Lógica de Negocio: SuscriptorService
 * Gestiona reglas de negocio sobre clientes y sus preferencias organolépticas.
 */
export class SuscriptorService {
  constructor(private readonly suscriptorRepository: SuscriptorRepository) {}

  public async listarSuscriptores(): Promise<Suscriptor[]> {
    // TODO: Implementar filtros, paginación y reglas de negocio adicionales
    return this.suscriptorRepository.findAll();
  }

  public async obtenerPorId(id: string): Promise<Suscriptor> {
    const suscriptor = await this.suscriptorRepository.findById(id);
    if (!suscriptor) {
      throw new AppError(`Suscriptor con ID ${id} no encontrado`, 404);
    }
    return suscriptor;
  }

  public async registrarSuscriptor(data: Partial<Suscriptor>): Promise<Suscriptor> {
    // TODO: Validar unicidad de email y reglas de onboarding
    if (!data.email) {
      throw new AppError('El email es requerido para registrar un suscriptor', 400);
    }
    return this.suscriptorRepository.create(data);
  }

  public async actualizarPreferenciasOrganolepticas(
    id: string,
    preferencias: Suscriptor['preferenciasOrganolepticas']
  ): Promise<Suscriptor> {
    // TODO: Validar perfil de sabor y compatibilidad con clubes disponibles
    const updated = await this.suscriptorRepository.update(id, { preferenciasOrganolepticas: preferencias });
    if (!updated) {
      throw new AppError(`No se pudo actualizar preferencias para el suscriptor ${id}`, 404);
    }
    return updated;
  }
}
