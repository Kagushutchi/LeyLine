import { Repository } from 'typeorm';
import { Suscriptor } from './suscriptor.entity';
import { IBaseRepository } from '../../common/interfaces/base-repository.interface';

/**
 * Componente de Acceso a Datos: SuscriptorRepository
 * Implementa el patrón Repository para la entidad Suscriptor.
 */
export class SuscriptorRepository implements IBaseRepository<Suscriptor> {
  constructor(private readonly ormRepository: Repository<Suscriptor>) {}

  public async findById(id: string): Promise<Suscriptor | null> {
    return this.ormRepository.findOneBy({ id });
  }

  public async findByEmail(email: string): Promise<Suscriptor | null> {
    return this.ormRepository.findOneBy({ email });
  }

  public async findAll(): Promise<Suscriptor[]> {
    return this.ormRepository.find();
  }

  public async create(item: Partial<Suscriptor>): Promise<Suscriptor> {
    const entity = this.ormRepository.create(item);
    return this.ormRepository.save(entity);
  }

  public async update(id: string, item: Partial<Suscriptor>): Promise<Suscriptor | null> {
    await this.ormRepository.update(id, item);
    return this.findById(id);
  }

  public async delete(id: string): Promise<boolean> {
    const result = await this.ormRepository.delete(id);
    return (result.affected ?? 0) > 0;
  }
}
