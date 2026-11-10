import { Entity, PrimaryGeneratedColumn, DeleteDateColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Suscriptor } from '../../suscriptores/infrastructure/suscriptor.entity';
import { CajaMensual } from '../../cajas-mensuales/infrastructure/caja-mensual.entity';

export type EstadoSuscripcion = 'activa' | 'pausada' | 'cancelada';
export type CategoriaClub = 'vinos' | 'cafes' | 'cervezas';

/**
 * Componente de Dominio: Suscripción (Pedido Recurrente)
 * Modela qué suscriptor contrata qué caja mensual.
 */
@Entity('suscripciones')
export class Suscripcion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  suscriptorId: string;

  @ManyToOne(() => Suscriptor, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'suscriptorId' })
  suscriptor: Suscriptor;

  @Column({ type: 'uuid' })
  cajaMensualId: string;

  @ManyToOne(() => CajaMensual, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'cajaMensualId' })
  cajaMensual: CajaMensual;

  @Column({ type: 'varchar', length: 50 })
  categoria: CategoriaClub;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'activa',
  })
  estado: EstadoSuscripcion;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  montoMensual: number;

  @Column({ type: 'date', nullable: true })
  fechaInicio: Date;

  @Column({ type: 'date', nullable: true })
  proximoCobro: Date;

  /**
   * Bodega/tostadero que gestiona esta suscripción (multi-tenancy).
   * Nullable: compatibilidad con suscripciones creadas antes de la multi-tenancy.
   */
  @Column({ type: 'uuid', nullable: true })
  tenantId?: string;

  /** Proveedor de pago que cobra la suscripción (null = alta administrativa sin cobro). */
  @Column({ type: 'varchar', length: 30, nullable: true })
  paymentProvider: string | null;

  /** Id opaco de la suscripción en el proveedor; sólo lo interpreta su IPaymentStrategy. */
  @Column({ type: 'varchar', length: 100, nullable: true })
  providerSubscriptionId: string | null;

  /**
   * true cuando la suscripción quedó pausada porque el proveedor rechazó un cobro (no porque el suscriptor la pausó).
   * Se reactiva sola al cobrarse; el suscriptor no puede reanudarla a mano sin pagar.
   */
  @Column({ type: 'boolean', default: false })
  pausadaPorPago: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
  @DeleteDateColumn({ nullable: true })
  deletedAt: Date | null;
}
