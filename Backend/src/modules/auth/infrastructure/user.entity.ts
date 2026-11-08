import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserRole } from '../../../common/interfaces/auth.interface';
import { Tenant } from './tenant.entity';

/**
 * Entidad de Infraestructura: User (Usuario del Sistema)
 * Modela las credenciales y perfiles de acceso:
 * - 'admin': Dueño/administrador de una bodega o inquilino.
 * - 'subscriptor': Cliente o consumidor final sin privilegios de administración.
 */
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  username: string;

  @Column({ type: 'varchar', length: 150, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 255 })
  password: string;

  @Column({ type: 'varchar', length: 20, default: 'subscriptor' })
  role: UserRole;

  @Column({ type: 'varchar', length: 150, nullable: true })
  nombre?: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  apellido?: string;

  @Column({ type: 'uuid', nullable: true })
  tenantId?: string;

  @ManyToOne(() => Tenant, (tenant) => tenant.usuarios, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'tenantId' })
  tenant?: Tenant;

  @Column({ type: 'text', nullable: true })
  refreshToken?: string | null;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn({ nullable: true })
  deletedAt: Date | null;
}

