import { getDataSource } from '../../../config/database.config';
import BaseTypeORM from '../../../common/classes/base-typeorm-repository';
import { Tenant } from './tenant.entity';

export class TenantRepository extends BaseTypeORM<Tenant> {
  constructor() {
    super(getDataSource().getRepository(Tenant));
  }

  async findBySlug(slug: string): Promise<Tenant | null> {
    return getDataSource().getRepository(Tenant).findOne({
      where: { slug },
    });
  }

  async findByNombre(nombre: string): Promise<Tenant | null> {
    return getDataSource().getRepository(Tenant).findOne({
      where: { nombre },
    });
  }
}
