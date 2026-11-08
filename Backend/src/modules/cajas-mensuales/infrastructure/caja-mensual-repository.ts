import { DataSource } from 'typeorm';
import { dataSource } from '../../../app';
import BaseTypeORM from '../../../common/classes/base-typeorm-repository';
import { CajaMensual } from './caja-mensual.entity';

export class CajaMensualRepository extends BaseTypeORM<CajaMensual> {
  constructor(private readonly db: DataSource = dataSource) {
    super(db.getRepository(CajaMensual));
  }

  private activeWithHistory() {
    // Las composiciones vigentes conservan el producto aunque este haya sido dado de baja.
    return this.db.getRepository(CajaMensual).createQueryBuilder('caja')
      .withDeleted()
      .leftJoinAndSelect('caja.composiciones', 'composicion', 'composicion.deletedAt IS NULL')
      .leftJoinAndSelect('composicion.producto', 'producto')
      .where('caja.deletedAt IS NULL');
  }

  public async findByMesAnio(mes: number, anio: number): Promise<CajaMensual[]> {
    return this.activeWithHistory().andWhere('caja.mes = :mes AND caja.anio = :anio', { mes, anio }).getMany();
  }

  public async findAll(tenantId?: string): Promise<CajaMensual[]> {
    const qb = this.activeWithHistory();
    if (tenantId) {
      qb.andWhere('(caja.tenantId = :tenantId OR caja.tenantId IS NULL)', { tenantId });
    }
    return qb.orderBy('caja.anio', 'DESC').addOrderBy('caja.mes', 'DESC').getMany();
  }

  public async findOneById(id: string | number): Promise<CajaMensual | null> {
    return this.activeWithHistory().andWhere('caja.id = :id', { id: String(id) }).getOne();
  }
}
