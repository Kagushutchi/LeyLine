import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

/** Cliente del proveedor de pago asociado a un suscriptor: se reutiliza en cada compra para no duplicar clientes. */
@Entity('clientes_pago')
@Index('uq_cliente_pago', ['provider', 'suscriptorId'], { unique: true })
export class ClientePago {
  @PrimaryColumn({ type: 'varchar', length: 36 }) id: string;
  @Column({ type: 'varchar', length: 30 }) provider: string;
  @Column({ type: 'varchar', length: 100 }) suscriptorId: string;
  @Column({ type: 'varchar', length: 100 }) providerCustomerId: string;
  @CreateDateColumn() createdAt: Date;
}
