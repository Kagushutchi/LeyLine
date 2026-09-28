import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Suscriptor } from '../../suscriptores/infrastructure/suscriptor.entity';

export type EstadoSuscripcion = 'activa' | 'pausada' | 'cancelada';
export type CategoriaClub = 'vinos' | 'cafes' | 'cervezas';

/**
 * Componente de Dominio: Suscripción (Pedido Recurrente)
 * Modela la membresía y el pedido mensual recurrente del suscriptor.
 */
@Entity('suscripciones')
export class Suscripcion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  suscriptorId: string;

  @ManyToOne(() => Suscriptor, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'suscriptorId' })
  suscriptor: Suscriptor;

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

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
