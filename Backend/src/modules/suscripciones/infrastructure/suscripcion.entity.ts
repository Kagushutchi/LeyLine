import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
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

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
