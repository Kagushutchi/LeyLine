import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Producto } from '../../productos/infrastructure/producto.entity';
import { CajaMensual } from './caja-mensual.entity';

@Entity('cajas_mensuales_productos')
export class CajaMensualProducto {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  cajaMensualId: string;

  @Column({ type: 'uuid' })
  productoId: string;

  @Column({ type: 'int' })
  cantidad: number;

  @Column({ type: 'int', nullable: true })
  orden?: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  precioAplicado?: number;

  @ManyToOne(() => CajaMensual, (caja) => caja.composiciones, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cajaMensualId' })
  cajaMensual: CajaMensual;

  @ManyToOne(() => Producto, (producto) => producto.composiciones, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'productoId' })
  producto: Producto;
}
