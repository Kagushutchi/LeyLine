import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CajaMensualProducto } from '../../cajas-mensuales/infrastructure/caja-mensual-producto.entity';

@Entity('productos')
export class Producto {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 150 })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  descripcion?: string;

  @Column({ type: 'varchar', length: 50 })
  categoria: string;

  @Column({ type: 'varchar', length: 100 })
  tipo: string;

  @Column({ type: 'varchar', length: 150 })
  productor: string;

  @Column({ type: 'simple-json', nullable: true })
  perfilNotas?: string[];

  @Column({ type: 'simple-json', nullable: true })
  alergenosRestricciones?: string[];

  @Column({ type: 'varchar', length: 100, unique: true, nullable: true })
  sku?: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  precioReferencia?: number;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @OneToMany(() => CajaMensualProducto, (composicion) => composicion.producto)
  composiciones: CajaMensualProducto[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
