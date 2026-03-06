import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, Index, ManyToOne, JoinColumn,
} from 'typeorm';
import { Role } from './role.entity';

/**
 * Table: user_roles
 * Affectation d'un rôle à un utilisateur, avec scope ville optionnel.
 *
 * Règle de scoping :
 *   - role.scope = GLOBAL → cityId DOIT être NULL
 *   - role.scope = CITY   → cityId DOIT être fourni
 *
 * Un utilisateur peut avoir plusieurs UserRoles :
 *   - Support dans ville A + Analyste dans ville A
 *   - City Admin dans ville A + City Admin dans ville B
 *
 * expiresAt : null = permanent, sinon révocation automatique.
 */
@Entity('user_roles')
@Index('idx_ur_user',      ['userId', 'isActive'])
@Index('idx_ur_role',      ['roleId'])
@Index('idx_ur_city',      ['cityId'])
@Index('idx_ur_user_city', ['userId', 'cityId'])
export class UserRole {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @Column({ type: 'uuid', name: 'role_id' })
  roleId: string;

  @ManyToOne(() => Role, (r) => r.userRoles, { eager: false })
  @JoinColumn({ name: 'role_id' })
  role: Role;

  /**
   * Ville pour les rôles scope=CITY.
   * NULL pour les rôles scope=GLOBAL.
   */
  @Column({ type: 'uuid', nullable: true, name: 'city_id' })
  cityId: string | null;

  /** UUID de l'admin qui a accordé ce rôle */
  @Column({ type: 'uuid', name: 'granted_by' })
  grantedBy: string;

  /** Date d'expiration automatique (null = permanent) */
  @Column({ type: 'timestamp', nullable: true, name: 'expires_at' })
  expiresAt: Date | null;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  /** Raison optionnelle pour l'audit */
  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @CreateDateColumn({ name: 'granted_at' })
  grantedAt: Date;
}
