import { Repository } from 'typeorm';
import { Suscripcion } from './suscripcion.entity';
import { IBaseRepository } from '../../common/interfaces/base-repository.interface';

/**
 * Componente de Acceso a Datos: SuscripcionRepository
 * Implementa el patrón Repository para la entidad Suscripcion.
 */
export class SuscripcionRepository implements IBaseRepository<Suscripcion> {
  constructor(private readonly ormRepository: Repository<Suscripcion>) {}

  public async findById(id: string): Promise<Suscripcion | null> {
    return this.ormRepository.findOne({
      where: { id },
      relations: ['suscriptor'],
    });
  }

  public async findBySuscriptorId(suscriptorId: string): Promise<Suscripcion[]> {
    return this.ormRepository.find({
      where: { suscriptorId },
      relations: ['suscriptor'],
    });
  }

  public async findAll(): Promise<Suscripcion[]> {
    return this.ormRepository.find({ relations: ['suscriptor'] });
  }

  public async create(item: Partial<Suscripcion>): Promise<Suscripcion> {
    const entity = this.ormRepository.create(item);
    return this.ormRepository.save(entity);
  }

  public async update(id: string, item: Partial<Suscripcion>): Promise<Suscripcion | null> {
    await this.ormRepository.update(id, item);
    return this.findById(id);
  }

  public async delete(id: string): Promise<boolean> {
    const result = await this.ormRepository.delete(id);
    return (result.affected ?? 0) > 0;
  }
}
