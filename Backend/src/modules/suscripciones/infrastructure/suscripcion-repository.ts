import { DataSource } from 'typeorm';
import { getDataSource } from '../../../config/database.config';
import BaseTypeORM from '../../../common/classes/base-typeorm-repository';
import { Suscripcion } from './suscripcion.entity';

export class SuscripcionRepository extends BaseTypeORM<Suscripcion> {
  constructor(private readonly db: DataSource = getDataSource()) {
    super(db.getRepository(Suscripcion));
  }

  private activeWithHistory() {
    // La suscripción activa conserva sus referencias históricas aun cuando se den de baja.
    return this.db.getRepository(Suscripcion).createQueryBuilder('suscripcion')
      .withDeleted()
      .leftJoinAndSelect('suscripcion.suscriptor', 'suscriptor')
      .leftJoinAndSelect('suscripcion.cajaMensual', 'caja')
      .leftJoinAndSelect('caja.composiciones', 'composicion', 'composicion.deletedAt IS NULL')
      .leftJoinAndSelect('composicion.producto', 'producto')
      .where('suscripcion.deletedAt IS NULL');
  }

  public async findAll(tenantId?: string, suscriptorId?: string): Promise<Suscripcion[]> {
    const qb = this.activeWithHistory();
    if (tenantId) {
      qb.andWhere('suscripcion.tenantId = :tenantId', { tenantId });
    }
    if (suscriptorId) {
      qb.andWhere('suscripcion.suscriptorId = :suscriptorId', { suscriptorId });
    }
    return qb.orderBy('suscripcion.createdAt', 'DESC').getMany();
  }

  public async findOneById(id: string | number, tenantId?: string): Promise<Suscripcion | null> {
    const qb = this.activeWithHistory().andWhere('suscripcion.id = :id', { id: String(id) });
    if (tenantId) {
      qb.andWhere('suscripcion.tenantId = :tenantId', { tenantId });
    }
    return qb.getOne();
  }

  public async findBySuscriptorId(suscriptorId: string): Promise<Suscripcion[]> {
    return this.activeWithHistory().andWhere('suscripcion.suscriptorId = :suscriptorId', { suscriptorId })
      .orderBy('suscripcion.createdAt', 'DESC').getMany();
  }

  public async update(id: string | number, entity: Partial<Suscripcion>): Promise<Suscripcion | null> {
    const existing = await this.findOneById(id);
    if (!existing) return null;
    const { deletedAt: _deletedAt, ...changes } = entity;
    Object.assign(existing, changes);
    return this.db.getRepository(Suscripcion).save(existing);
  }
}
