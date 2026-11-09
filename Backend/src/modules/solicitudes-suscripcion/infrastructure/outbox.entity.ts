import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('mensajes_outbox')
@Index('uq_outbox_solicitud', ['solicitudId'], { unique: true })
@Index('idx_outbox_pendiente', ['createdAt'], { where: `"estado" = 'pendiente'` })
export class MensajeOutbox {
  @PrimaryColumn({ type: 'varchar', length: 36 }) id: string;
  @Column({ type: 'varchar', length: 36 }) solicitudId: string;
  @Column({ type: 'varchar', length: 100 }) tipo: string;
  @Column({ type: 'int' }) version: number;
  @Column({ type: 'text' }) contenido: string;
  @Column({ type: 'varchar', length: 20, default: 'pendiente' }) estado: string;
  @Column({ type: 'int', default: 0 }) intentos: number;
  @Column({ type: 'bigint', nullable: true }) nextAttemptAt: number | null;
  @Column({ type: 'varchar', length: 36, nullable: true }) claimToken: string | null;
  @Column({ type: 'bigint', nullable: true }) claimUntil: number | null;
  @Column({ type: 'bigint', nullable: true }) publishedAt: number | null;
  @CreateDateColumn() createdAt: Date;
}
