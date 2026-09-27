import { Repository } from 'typeorm';
import { CajaMensual } from './caja-mensual.entity';
import { IBaseRepository } from '../../common/interfaces/base-repository.interface';

/**
 * Componente de Acceso a Datos: CajaMensualRepository
 * Implementa el patrón Repository para la entidad CajaMensual.
 */
export class CajaMensualRepository implements IBaseRepository<CajaMensual> {
  constructor(private readonly ormRepository: Repository<CajaMensual>) {}

  public async findById(id: string): Promise<CajaMensual | null> {
    return this.ormRepository.findOneBy({ id });
  }

  public async findByMesAnio(mes: number, anio: number): Promise<CajaMensual[]> {
    return this.ormRepository.findBy({ mes, anio });
  }

  public async findAll(): Promise<CajaMensual[]> {
    return this.ormRepository.find();
  }

  public async create(item: Partial<CajaMensual>): Promise<CajaMensual> {
    const entity = this.ormRepository.create(item);
    return this.ormRepository.save(entity);
  }

  public async update(id: string, item: Partial<CajaMensual>): Promise<CajaMensual | null> {
    await this.ormRepository.update(id, item);
    return this.findById(id);
  }

  public async delete(id: string): Promise<boolean> {
    const result = await this.ormRepository.delete(id);
    return (result.affected ?? 0) > 0;
  }
}
