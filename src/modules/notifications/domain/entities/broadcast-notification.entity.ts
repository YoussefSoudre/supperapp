import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';

export enum BroadcastStatus {
  PENDING    = 'pending',
  PROCESSING = 'processing',
  COMPLETED  = 'completed',
  FAILED     = 'failed',
  CANCELLED  = 'cancelled',
}

/**
 * Table: broadcast_notifications
 * Représente une notification de masse envoyée à une ville ou un rôle.
 * Le BroadcastService décompose un broadcast en N jobs individuels dans la queue.
 *
 * Écriture : 1 row par broadcast.
 * Mise à jour : sentCount, failedCount au fur et à mesure via le processor.
 */
@Entity('broadcast_notifications')
@Index('idx_broadcast_status',    ['status', 'scheduledAt'])
@Index('idx_broadcast_city_role', ['targetCityId', 'targetRole'])
export class BroadcastNotification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Créateur du broadcast (admin) */
  @Column({ type: 'uuid', name: 'created_by' })
  createdBy: string;

  /** Ville ciblée (null = toutes les villes) */
  @Column({ type: 'uuid', nullable: true, name: 'target_city_id' })
  targetCityId: string | null;

  /** Rôle ciblé : driver | user | admin (null = tous) */
  @Column({ length: 50, nullable: true, name: 'target_role' })
  targetRole: string | null;

  @Column({ length: 250 })
  title: string;

  @Column({ type: 'text' })
  body: string;

  /** Données additionnelles à attacher à chaque notification individuelle */
  @Column({ type: 'jsonb', nullable: true })
  data: Record<string, unknown> | null;

  /** Canaux à utiliser : ['push', 'in_app', ...] */
  @Column({ type: 'jsonb', default: () => "'[\"push\",\"in_app\"]'" })
  channels: string[];

  /**
   * Filtres additionnels appliqués côté BroadcastService
   * ex: { minCreatedDaysAgo: 0, hasActiveRide: false }
   */
  @Column({ type: 'jsonb', nullable: true })
  filters: Record<string, unknown> | null;

  @Column({ type: 'enum', enum: BroadcastStatus, default: BroadcastStatus.PENDING })
  status: BroadcastStatus;

  /** Nombre total de destinataires identifiés */
  @Column({ default: 0, name: 'total_recipients' })
  totalRecipients: number;

  /** Notifications envoyées avec succès */
  @Column({ default: 0, name: 'sent_count' })
  sentCount: number;

  /** Notifications échouées définitivement */
  @Column({ default: 0, name: 'failed_count' })
  failedCount: number;

  /** Date planifiée (null = immédiat) */
  @Column({ type: 'timestamp', nullable: true, name: 'scheduled_at' })
  scheduledAt: Date | null;

  @Column({ type: 'timestamp', nullable: true, name: 'started_at' })
  startedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true, name: 'completed_at' })
  completedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
