import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export interface VariedadProductoItem {
  nombre: string;
  productorBodega: string;
  tipo: string;
  perfilNotas: string[];
  cantidad: number;
}

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

  /**
   * Variedades o botellas que componen la caja
   */
  @Column({ type: 'simple-json', nullable: true })
  items?: VariedadProductoItem[];

  @Column({ type: 'boolean', default: true })
  disponible: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
