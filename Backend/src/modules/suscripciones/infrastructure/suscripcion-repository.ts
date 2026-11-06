import { DataSource } from 'typeorm';
import { dataSource } from '../../../app';
import BaseTypeORM from '../../../common/classes/base-typeorm-repository';
import { Suscripcion } from './suscripcion.entity';

export class SuscripcionRepository extends BaseTypeORM<Suscripcion> {
  constructor(private readonly db: DataSource = dataSource) {
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

  public async findAll(): Promise<Suscripcion[]> {
    return this.activeWithHistory().orderBy('suscripcion.createdAt', 'DESC').getMany();
  }

  public async findOneById(id: string | number): Promise<Suscripcion | null> {
    return this.activeWithHistory().andWhere('suscripcion.id = :id', { id: String(id) }).getOne();
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
