import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';

export enum NotificationChannel {
  PUSH      = 'push',
  SMS       = 'sms',
  EMAIL     = 'email',
  IN_APP    = 'in_app',
  WEBSOCKET = 'websocket',
}

export enum NotificationStatus {
  PENDING   = 'pending',
  QUEUED    = 'queued',
  SENT      = 'sent',
  DELIVERED = 'delivered',
  FAILED    = 'failed',
  READ      = 'read',
  SCHEDULED = 'scheduled',
  CANCELLED = 'cancelled',
}

export enum NotificationPriority {
  LOW      = 'low',
  NORMAL   = 'normal',
  HIGH     = 'high',
  CRITICAL = 'critical',
}

export enum NotificationCategory {
  RIDE       = 'ride',
  PAYMENT    = 'payment',
  PROMO      = 'promo',
  SYSTEM     = 'system',
  REFERRAL   = 'referral',
  DELIVERY   = 'delivery',
  FOOD       = 'food',
}

/**
 * Table: notifications
 * Log persistant de toutes les notifications envoyées.
 * PARTITIONNEMENT recommandé : RANGE (created_at) en production.
 * Chaque row = 1 notification × 1 channel × 1 destinataire.
 */
@Entity('notifications')
@Index('idx_notif_user',      ['userId', 'status', 'createdAt'])
@Index('idx_notif_unread',    ['userId', 'status'], { where: '"status" IN (\'pending\',\'queued\',\'sent\',\'delivered\')' })
@Index('idx_notif_category',  ['userId', 'category'])
@Index('idx_notif_scheduled', ['scheduledAt', 'status'], { where: '"status" = \'scheduled\'' })
@Index('idx_notif_city',      ['cityId', 'createdAt'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @Column({ type: 'enum', enum: NotificationChannel })
  channel: NotificationChannel;

  @Column({ type: 'enum', enum: NotificationCategory })
  category: NotificationCategory;

  @Column({
    type: 'enum',
    enum: NotificationStatus,
    default: NotificationStatus.PENDING,
  })
  status: NotificationStatus;

  @Column({
    type: 'enum',
    enum: NotificationPriority,
    default: NotificationPriority.NORMAL,
  })
  priority: NotificationPriority;

  @Column({ length: 250 })
  title: string;

  @Column({ type: 'text' })
  body: string;

  /** Données additionnelles pour deep-link (ex: { rideId: "xxx" }) */
  @Column({ type: 'jsonb', nullable: true })
  data: Record<string, unknown> | null;

  /** Ville ciblée (null = toutes les villes) */
  @Column({ type: 'uuid', nullable: true, name: 'city_id' })
  cityId: string | null;

  /** Rôle ciblé : driver | user | admin (null = tous) */
  @Column({ type: 'varchar', length: 50, nullable: true, name: 'target_role' })
  targetRole: string | null;

  /** Identifiant du device token FCM / Expo push token */
  @Column({ type: 'text', nullable: true, name: 'device_token' })
  deviceToken: string | null;

  /** Email du destinataire (cache, évite join users) */
  @Column({ type: 'varchar', length: 255, nullable: true, name: 'recipient_email' })
  recipientEmail: string | null;

  /** Numéro de téléphone E.164 (ex : +22670000000) */
  @Column({ type: 'varchar', length: 25, nullable: true, name: 'recipient_phone' })
  recipientPhone: string | null;

  /** ID retourné par FCM / Twilio / SendGrid */
  @Column({ type: 'varchar', length: 255, nullable: true, name: 'provider_message_id' })
  providerMessageId: string | null;

  /** Nombre de tentatives déjà effectuées */
  @Column({ default: 0, name: 'retry_count' })
  retryCount: number;

  /** Nombre maximum de tentatives avant abandon */
  @Column({ default: 3, name: 'max_retries' })
  maxRetries: number;

  /** Prochaine tentative planifiée (backoff exponentiel) */
  @Column({ type: 'timestamp', nullable: true, name: 'next_retry_at' })
  nextRetryAt: Date | null;

  /** Pour les notifications programmées */
  @Column({ type: 'timestamp', nullable: true, name: 'scheduled_at' })
  scheduledAt: Date | null;

  @Column({ type: 'timestamp', nullable: true, name: 'sent_at' })
  sentAt: Date | null;

  @Column({ type: 'timestamp', nullable: true, name: 'delivered_at' })
  deliveredAt: Date | null;

  @Column({ type: 'timestamp', nullable: true, name: 'read_at' })
  readAt: Date | null;

  @Column({ type: 'text', nullable: true, name: 'failure_reason' })
  failureReason: string | null;

  /** ID du job BullMQ (pour annulation si scheduled) */
  @Column({ type: 'varchar', length: 255, nullable: true, name: 'queue_job_id' })
  queueJobId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
