import {
  Entity, Column, Index,
  ManyToOne, JoinColumn, PrimaryGeneratedColumn, CreateDateColumn,
} from 'typeorm';
import { Role }       from './role.entity';
import { Permission } from './permission.entity';

/**
 * Table: role_permissions
 * Table de jointure explicite Role ↔ Permission.
 *
 * Avantage vs @ManyToMany implicite :
 *  - On peut ajouter des métadonnées (grantedBy, createdAt)
 *  - Delete précis sans cascades accidentelles
 *  - Traçabilité de qui a ajouté quelle permission à quel rôle
 *
 * Index unique (roleId, permissionId) empêche les doublons.
 */
@Entity('role_permissions')
@Index('idx_rp_role',       ['roleId'])
@Index('idx_rp_permission', ['permissionId'])
@Index('idx_rp_unique',     ['roleId', 'permissionId'], { unique: true })
export class RolePermission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'role_id' })
  roleId: string;

  @Column({ type: 'uuid', name: 'permission_id' })
  permissionId: string;

  @ManyToOne(() => Role, (r) => r.rolePermissions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'role_id' })
  role: Role;

  @ManyToOne(() => Permission, (p) => p.rolePermissions, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'permission_id' })
  permission: Permission;

  /** Admin qui a accordé cette permission au rôle */
  @Column({ type: 'uuid', nullable: true, name: 'granted_by' })
  grantedBy: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
