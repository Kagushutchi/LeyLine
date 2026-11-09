import { dataSource } from '../../../app';
import BaseTypeORM from '../../../common/classes/base-typeorm-repository';
import { Suscriptor } from './suscriptor.entity';
import { IsNull } from 'typeorm';

export class SuscriptorRepository extends BaseTypeORM<Suscriptor> {
  constructor() {
    super(dataSource.getRepository(Suscriptor));
  }

  async findAll(tenantId?: string): Promise<Suscriptor[]> {
    const repo = dataSource.getRepository(Suscriptor);
    if (tenantId) {
      return await repo.find({
        where: {
          tenantId,
          deletedAt: IsNull(),
        },
        order: {
          createdAt: 'DESC',
        },
      });
    }
    return await repo.find({
      where: {
        deletedAt: IsNull(),
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async findOneById(id: string | number, tenantId?: string): Promise<Suscriptor | null> {
    const repo = dataSource.getRepository(Suscriptor);
    if (tenantId) {
      return await repo.findOne({
        where: {
          id: String(id),
          tenantId,
          deletedAt: IsNull(),
        },
      });
    }
    return await repo.findOne({
      where: {
        id: String(id),
        deletedAt: IsNull(),
      },
    });
  }
}
