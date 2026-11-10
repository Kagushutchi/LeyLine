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
  @Column({ type: 'varchar', length: 30, nullable: true }) paymentProvider: string | null;
  @Column({ type: 'varchar', length: 100, nullable: true }) providerSessionId: string | null;
  @Column({ type: 'text', nullable: true }) checkoutUrl: string | null;
  /** Importe cobrado por el proveedor (en centavos de `chargeCurrency`) y tipo de cambio aplicado, para auditoría. */
  @Column({ type: 'int', nullable: true }) chargeAmountCents: number | null;
  @Column({ type: 'varchar', length: 10, nullable: true }) chargeCurrency: string | null;
  @Column({ type: 'varchar', length: 32, nullable: true }) fxRate: string | null;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
