import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Producto } from '../../productos/infrastructure/producto.entity';

@Entity('stock_productos')
export class StockProducto {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', unique: true })
  productoId: string;

  @Column({ type: 'varchar', length: 150 })
  productor: string;

  @Column({ type: 'int', default: 0 })
  cantidadDisponible: number;

  @Column({ type: 'int', default: 0 })
  cantidadReservada: number;

  @ManyToOne(() => Producto, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'productoId' })
  producto: Producto;

  @UpdateDateColumn()
  actualizadoEn: Date;
}
