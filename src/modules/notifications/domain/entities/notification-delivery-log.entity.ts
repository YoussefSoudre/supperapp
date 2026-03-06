import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, Index, ManyToOne, JoinColumn,
} from 'typeorm';
import { Notification, NotificationChannel } from './notification.entity';

export enum DeliveryStatus {
  SUCCESS = 'success',
  FAILURE = 'failure',
}

/**
 * Table: notification_delivery_logs
 * Trace chaque tentative de livraison (retry inclus).
 * Une notification peut avoir 1-N lignes (une par tentative).
 *
 * Retient : provider, latence, code HTTP, message d'erreur.
 * Permet de diagnostiquer les pics d'échec par canal/provider.
 */
@Entity('notification_delivery_logs')
@Index('idx_ndl_notification', ['notificationId', 'attempt'])
@Index('idx_ndl_status',       ['status', 'createdAt'])
export class NotificationDeliveryLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'notification_id' })
  notificationId: string;

  @ManyToOne(() => Notification, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'notification_id' })
  notification: Notification;

  /** Numéro de la tentative (1-based) */
  @Column({ type: 'smallint', default: 1 })
  attempt: number;

  @Column({ type: 'enum', enum: NotificationChannel })
  channel: NotificationChannel;

  /** Nom du provider utilisé : 'FCM', 'Twilio', 'SendGrid', 'internal', etc. */
  @Column({ length: 60 })
  provider: string;

  @Column({ type: 'enum', enum: DeliveryStatus })
  status: DeliveryStatus;

  /** Code HTTP ou code interne retourné par le provider */
  @Column({ type: 'int', nullable: true, name: 'status_code' })
  statusCode: number | null;

  /** Message ID retourné par le provider (FCM message ID, Twilio SID, etc.) */
  @Column({ type: 'varchar', length: 255, nullable: true, name: 'provider_message_id' })
  providerMessageId: string | null;

  /** Détail de l'erreur si status = FAILURE */
  @Column({ type: 'text', nullable: true, name: 'error_detail' })
  errorDetail: string | null;

  /** Latence en millisecondes (appel provider) */
  @Column({ type: 'int', nullable: true, name: 'duration_ms' })
  durationMs: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
