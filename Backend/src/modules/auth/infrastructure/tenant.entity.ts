import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

/**
 * Entidad de Infraestructura: Tenant (Inquilino / Bodega / Tostadero)
 * Representa la empresa o productor que gestiona su propio catálogo y suscriptores en la plataforma SaaS.
 */
@Entity('tenants')
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 150 })
  nombre: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  slug: string;

  @Column({ type: 'varchar', length: 50, default: 'artesanal' })
  plan: string;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @OneToMany(() => User, (user) => user.tenant)
  usuarios: User[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn({ nullable: true })
  deletedAt: Date | null;
}

