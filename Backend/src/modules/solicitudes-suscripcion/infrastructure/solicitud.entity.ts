import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('solicitudes_suscripcion')
@Index('uq_solicitud_idempotencia', ['principalId', 'idempotencyKey'], { unique: true })
@Index('idx_solicitud_suscriptor_caja', ['suscriptorId', 'cajaMensualId'])
export class SolicitudSuscripcion {
  @PrimaryColumn({ type: 'varchar', length: 36 }) id: string;
  @Column({ type: 'varchar', length: 100 }) tenantId: string;
  @Column({ type: 'varchar', length: 100 }) principalId: string;
  @Column({ type: 'varchar', length: 100 }) suscriptorId: string;
  @Column({ type: 'varchar', length: 100 }) cajaMensualId: string;
  @Column({ type: 'varchar', length: 128 }) idempotencyKey: string;
  @Column({ type: 'varchar', length: 64 }) payloadHash: string;
  @Column({ type: 'decimal', precision: 10, scale: 2 }) precioConfirmado: string;
  @Column({ type: 'int', default: 0 }) intentosProcesamiento: number;
  @Column({ type: 'varchar', length: 20, default: 'pendiente' }) estado: string;
  @Column({ type: 'varchar', length: 100, nullable: true }) suscripcionId: string | null;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
