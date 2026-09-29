import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { CajaMensualProducto } from './caja-mensual-producto.entity';

/**
 * Componente de Dominio: CajaMensual (Producto)
 * Representa la caja temática mensual o personalizada enviada a los suscriptores.
 */
@Entity('cajas_mensuales')
export class CajaMensual {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 150 })
  nombre: string;

  @Column({ type: 'varchar', length: 50 })
  categoria: 'vinos' | 'cafes' | 'cervezas';

  @Column({ type: 'int' })
  mes: number;

  @Column({ type: 'int' })
  anio: number;

  @Column({ type: 'text', nullable: true })
  descripcion?: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  precioBase: number;

  @OneToMany(() => CajaMensualProducto, (composicion) => composicion.cajaMensual, {
    cascade: ['insert', 'update'],
    orphanedRowAction: 'delete',
  })
  composiciones: CajaMensualProducto[];

  @Column({ type: 'boolean', default: true })
  disponible: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
