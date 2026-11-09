import { DataSource } from 'typeorm';
import { getDataSource } from '../../../config/database.config';
import BaseTypeORM from '../../../common/classes/base-typeorm-repository';
import { Producto } from './producto.entity';

export class ProductoRepository extends BaseTypeORM<Producto> {
  constructor(private readonly db: DataSource = getDataSource()) {
    super(db.getRepository(Producto));
  }

  private activeWithHistory() {
    return this.db.getRepository(Producto).createQueryBuilder('producto')
      .withDeleted()
      .leftJoinAndSelect('producto.composiciones', 'composicion', 'composicion.deletedAt IS NULL')
      .leftJoinAndSelect('composicion.cajaMensual', 'caja')
      .where('producto.deletedAt IS NULL');
  }

  async findAll(tenantId?: string): Promise<Producto[]> {
    const qb = this.activeWithHistory();
    if (tenantId) {
      qb.andWhere('producto.tenantId = :tenantId', { tenantId });
    }
    return qb.orderBy('producto.nombre', 'ASC').getMany();
  }

  async findOneById(id: string | number): Promise<Producto | null> {
    return this.activeWithHistory().andWhere('producto.id = :id', { id: String(id) }).getOne();
  }
}
