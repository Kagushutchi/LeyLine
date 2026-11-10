import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

/** Cache de planes recurrentes creados en cada proveedor (los precios de los proveedores son inmutables). */
@Entity('planes_pago')
@Index('uq_plan_pago', ['provider', 'cajaMensualId', 'amountCents', 'currency'], { unique: true })
export class PlanPago {
  @PrimaryColumn({ type: 'varchar', length: 36 }) id: string;
  @Column({ type: 'varchar', length: 30 }) provider: string;
  @Column({ type: 'varchar', length: 100 }) cajaMensualId: string;
  @Column({ type: 'int' }) amountCents: number;
  @Column({ type: 'varchar', length: 10 }) currency: string;
  @Column({ type: 'varchar', length: 100 }) providerPlanId: string;
  @CreateDateColumn() createdAt: Date;
}
