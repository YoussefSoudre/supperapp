import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, Index,
} from 'typeorm';

/**
 * Actions possibles dans le journal d'audit des annonces.
 */
export enum AnnouncementAuditAction {
  CREATED     = 'created',     // Annonce créée en brouillon
  UPDATED     = 'updated',     // Annonce modifiée
  SCHEDULED   = 'scheduled',   // Publication planifiée définie
  PUBLISHED   = 'published',   // Annonce publiée (manuelle ou automatique)
  ARCHIVED    = 'archived',    // Annonce archivée
  DELETED     = 'deleted',     // Soft-delete
  DUPLICATED  = 'duplicated',  // Clonée depuis une autre annonce
  REPUBLISHED = 'republished', // Archivée → réactivée → DRAFT
}

/**
 * Table: announcement_audit_logs
 * ─────────────────────────────
 * Journal immuable de toutes les actions effectuées sur une annonce.
 * Chaque entrée est créée automatiquement par AnnouncementsService.
 *
 * Règles :
 *   - Jamais effacée (logs permanents)
 *   - adminId peut être null si l'action est automatique (cron)
 */
@Entity('announcement_audit_logs')
@Index('idx_ann_audit_announcement', ['announcementId'])
@Index('idx_ann_audit_admin',        ['adminId'])
@Index('idx_ann_audit_created_at',   ['createdAt'])
export class AnnouncementAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Annonce concernée */
  @Column({ type: 'uuid', name: 'announcement_id' })
  announcementId: string;

  /** Admin ayant effectué l'action (null = action automatique via cron) */
  @Column({ type: 'uuid', name: 'admin_id', nullable: true })
  adminId: string | null;

  /** Action effectuée */
  @Column({ type: 'enum', enum: AnnouncementAuditAction })
  action: AnnouncementAuditAction;

  /**
   * Données contextuelles de l'action.
   * Exemples :
   *   published  → { broadcastId, channels }
   *   updated    → { changes: ['title', 'content'] }
   *   duplicated → { sourceId }
   *   scheduled  → { scheduledAt }
   */
  @Column({ type: 'jsonb', nullable: true })
  meta: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
