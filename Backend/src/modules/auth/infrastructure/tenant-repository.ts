import { DataSource } from 'typeorm';
import { dataSource } from '../../../app';
import BaseTypeORM from '../../../common/classes/base-typeorm-repository';
import { Tenant } from './tenant.entity';

export class TenantRepository extends BaseTypeORM<Tenant> {
  constructor(private readonly db: DataSource = dataSource) {
    super(db.getRepository(Tenant));
  }

  async findBySlug(slug: string): Promise<Tenant | null> {
    return this.db.getRepository(Tenant).findOne({
      where: { slug },
    });
  }

  async findByNombre(nombre: string): Promise<Tenant | null> {
    return this.db.getRepository(Tenant).findOne({
      where: { nombre },
    });
  }
}

