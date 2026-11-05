import { getDataSource } from '../../../config/database.config';
import BaseTypeORM from '../../../common/classes/base-typeorm-repository';
import { Suscripcion } from './suscripcion.entity';

export class SuscripcionRepository extends BaseTypeORM<Suscripcion> {
  constructor() {
    super(getDataSource().getRepository(Suscripcion));
  }

  public async findAll(): Promise<Suscripcion[]> {
    return await getDataSource().getRepository(Suscripcion).find({
      relations: { suscriptor: true, cajaMensual: { composiciones: { producto: true } } },
      order: { createdAt: 'DESC' },
    });
  }

  public async findOneById(id: string | number): Promise<Suscripcion | null> {
    return await getDataSource().getRepository(Suscripcion).findOne({
      where: { id: String(id) },
      relations: { suscriptor: true, cajaMensual: { composiciones: { producto: true } } },
    });
  }

  public async findBySuscriptorId(suscriptorId: string): Promise<Suscripcion[]> {
    return await getDataSource().getRepository(Suscripcion).find({
      where: { suscriptorId },
      relations: { suscriptor: true, cajaMensual: { composiciones: { producto: true } } },
      order: { createdAt: 'DESC' },
    });
  }

  public async update(id: string | number, entity: Partial<Suscripcion>): Promise<Suscripcion | null> {
    const existing = await this.findOneById(id);
    if (!existing) return null;

    Object.assign(existing, entity);
    return await getDataSource().getRepository(Suscripcion).save(existing);
  }
}
