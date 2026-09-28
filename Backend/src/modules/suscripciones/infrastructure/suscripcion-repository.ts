import { dataSource } from '../../../app';
import BaseTypeORM from '../../../common/classes/base-typeorm-repository';
import { Suscripcion } from './suscripcion.entity';

export class SuscripcionRepository extends BaseTypeORM<Suscripcion> {
  constructor() {
    super(dataSource.getRepository(Suscripcion));
  }

  public async findBySuscriptorId(suscriptorId: string): Promise<Suscripcion[]> {
    return await dataSource.getRepository(Suscripcion).find({
      where: { suscriptorId },
      relations: ['suscriptor'],
    });
  }
}
