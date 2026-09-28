import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

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

  @Column({ type: 'varchar', length: 150, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  telefono?: string;

  /**
   * Registro de preferencias organolépticas (sabores preferidos, intensidad, alergias)
   */
  @Column({ type: 'simple-json', nullable: true })
  preferenciasOrganolepticas?: {
    categoria: 'vinos' | 'cafes' | 'cervezas';
    perfilSabor: string[];
    alergiasRestricciones: string[];
    notasAdicionales?: string;
  };

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
