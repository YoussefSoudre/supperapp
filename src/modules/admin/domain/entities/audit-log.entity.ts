import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, Index,
} from 'typeorm';

export enum AuditOutcome {
  ALLOWED = 'allowed',
  DENIED  = 'denied',
  ERROR   = 'error',
}

/**
 * Table: audit_logs
 * Trace immuable de toute vérification de permission et toute action sensible.
 *
 * PARTITIONNEMENT recommandé en production : RANGE (created_at) par mois.
 * Rétention : 12 mois (archivage oblig. UEMOA/CEDEAO à définir).
 *
 * Écrit par :
 *  1. PermissionGuard   → chaque vérification d'accès (allowed + denied)
 *  2. AuditService      → actions explicites (create/update/delete sur entités sensibles)
 *
 * NE PAS lier en FK (userId → users) : les logs doivent persister
 * même après suppression d'un utilisateur.
 */
@Entity('audit_logs')
@Index('idx_al_user',    ['userId', 'createdAt'])
@Index('idx_al_outcome', ['outcome', 'createdAt'])
@Index('idx_al_resource',['resource', 'resourceId'])
@Index('idx_al_city',    ['cityId', 'createdAt'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** ID de l'utilisateur qui a effectué l'action (null = système) */
  @Column({ type: 'uuid', nullable: true, name: 'user_id' })
  userId: string | null;

  /**
   * Rôle actif au moment de l'action (snapshot — ne change pas si le rôle est révoqué).
   * Format : "city_admin" ou "super_admin:global"
   */
  @Column({ type: 'varchar', length: 200, nullable: true, name: 'active_roles' })
  activeRoles: string | null;

  /**
   * Permission vérifiée ou action métier.
   * Exemples : "rides:manage", "users:ban", "pricing:configure"
   *            "ENTITY_CREATE", "ENTITY_UPDATE", "ENTITY_DELETE"
   */
  @Column({ length: 100 })
  action: string;

  /** Module/ressource concerné : rides, users, payments, roles, permissions… */
  @Column({ length: 100 })
  resource: string;

  /** UUID de l'entité impactée (ex: rideId, userId) — null si liste/création */
  @Column({ type: 'uuid', nullable: true, name: 'resource_id' })
  resourceId: string | null;

  /** Ville concernée par l'action (null = global) */
  @Column({ type: 'uuid', nullable: true, name: 'city_id' })
  cityId: string | null;

  @Column({ type: 'enum', enum: AuditOutcome })
  outcome: AuditOutcome;

  /** Raison du refus si outcome=DENIED */
  @Column({ type: 'text', nullable: true, name: 'denial_reason' })
  denialReason: string | null;

  @Column({ type: 'varchar', length: 45, nullable: true, name: 'ip_address' })
  ipAddress: string | null;

  @Column({ type: 'text', nullable: true, name: 'user_agent' })
  userAgent: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true, name: 'http_method' })
  httpMethod: string | null;

  @Column({ type: 'text', nullable: true, name: 'request_path' })
  requestPath: string | null;

  /**
   * Snapshot des données avant/après pour les mutations (optionnel, JSONB).
   * ex: { before: { status: 'active' }, after: { status: 'suspended' } }
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
