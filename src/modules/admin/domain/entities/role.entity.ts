import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, Index, OneToMany,
} from 'typeorm';
import { RolePermission } from './role-permission.entity';
import { UserRole }       from './user-role.entity';

export enum RoleScope {
  /** S'applique à toute la plateforme — aucune contrainte de ville */
  GLOBAL = 'global',
  /** S'applique uniquement à la ville spécifiée dans UserRole.cityId */
  CITY   = 'city',
}

/**
 * Table: roles
 * RBAC dynamique — les rôles sont définis en base, jamais en dur dans le code.
 *
 * Rôles système (isSystem=true) : non modifiables/supprimables via l'API.
 *   super_admin  → scope GLOBAL — toutes permissions
 *   city_admin   → scope CITY   — gestion complète d'une ville
 *   manager      → scope CITY   — opérations quotidiennes
 *   support      → scope CITY   — lecture + actions correctives
 *   finance      → scope CITY   — lecture financière + exports (scopé par ville)
 *   analyste     → scope CITY   — lecture seule analytics (scopé par ville)
 *
 * Extensibilité : créer un Role en DB + assigner des RolePermissions.
 * Aucune modification de code requise.
 */
@Entity('roles')
@Index('idx_roles_slug',  ['slug'],  { unique: true })
@Index('idx_roles_scope', ['scope'])
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string; // Nom lisible : "City Admin"

  @Column({ length: 100, unique: true })
  slug: string; // Clé machine : "city_admin"

  /** global = toute la plateforme | city = scopé à une ville via UserRole.cityId */
  @Column({ type: 'enum', enum: RoleScope, default: RoleScope.CITY })
  scope: RoleScope;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  /** Couleur hex pour le dashboard (ex: #E53E3E) */
  @Column({ type: 'varchar', length: 20, nullable: true })
  color: string | null;

  /** Rôle système : non supprimable, non renommable */
  @Column({ type: 'boolean', default: false, name: 'is_system' })
  isSystem: boolean;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  @OneToMany(() => RolePermission, (rp) => rp.role)
  rolePermissions: RolePermission[];

  @OneToMany(() => UserRole, (ur) => ur.role)
  userRoles: UserRole[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
