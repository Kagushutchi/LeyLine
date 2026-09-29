import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export interface DireccionSuscriptor {
  calle?: string;
  numero?: string;
  piso?: string;
  departamento?: string;
  ciudad?: string;
  provincia?: string;
  codigoPostal?: string;
  pais?: string;
  [key: string]: unknown;
}

export interface PreferenciasOrganolepticas {
  categoria?: 'vinos' | 'cafes' | 'cervezas' | string;
  perfilSabor?: string[];
  intensidad?: string;
  alergiasRestricciones?: string[];
  notasAdicionales?: string;
  [key: string]: unknown;
}

/**
 * Componente de Dominio: Suscriptor (Cliente)
 * Representa al usuario suscripto a los clubes de nicho (vino, café, cerveza).
 */
@Entity('suscriptores')
export class Suscriptor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 150 })
  nombre: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  apellido?: string;

  @Column({ type: 'varchar', length: 150, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  telefono?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  documento?: string;

  @Column({ type: 'simple-json', nullable: true })
  direccion?: DireccionSuscriptor;

  /**
   * Registro de preferencias organolépticas (sabores preferidos, intensidad, alergias)
   */
  @Column({ type: 'simple-json', nullable: true })
  preferenciasOrganolepticas?: PreferenciasOrganolepticas;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
