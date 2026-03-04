import { NotificationPriority } from '../entities/notification.entity';

// ─── Queue names ─────────────────────────────────────────────────────────────
export const NOTIFICATION_QUEUES = {
  PUSH:      'notification:push',
  SMS:       'notification:sms',
  EMAIL:     'notification:email',
  INAPP:     'notification:inapp',
  WEBSOCKET: 'notification:websocket',
} as const;

export type NotificationQueueName =
  (typeof NOTIFICATION_QUEUES)[keyof typeof NOTIFICATION_QUEUES];

// ─── BullMQ priority mapping (lower number = higher priority) ────────────────
export const BULLMQ_PRIORITY: Record<NotificationPriority, number> = {
  [NotificationPriority.CRITICAL]: 1,
  [NotificationPriority.HIGH]:     2,
  [NotificationPriority.NORMAL]:   3,
  [NotificationPriority.LOW]:      10,
};

// ─── Retry / backoff ─────────────────────────────────────────────────────────
export const RETRY_CONFIG = {
  maxAttempts:        3,
  backoffType:        'exponential' as const,
  backoffDelayMs:     5_000,      // 5 s → 25 s → 125 s
  removeOnComplete:   100,        // keep last 100 done jobs
  removeOnFail:       500,
};

// ─── Rate limits (sliding window Redis) ─────────────────────────────────────
/**
 * max = nombre max de notifications autorisées dans la fenêtre windowSec.
 * Par utilisateur × par canal.
 */
export const RATE_LIMITS: Record<string, { max: number; windowSec: number }> = {
  push:      { max: 10,  windowSec: 3_600  },  // 10/heure
  sms:       { max: 3,   windowSec: 86_400 },  // 3/jour
  email:     { max: 100, windowSec: 86_400 },  // 100/jour
  in_app:    { max: 50,  windowSec: 3_600  },  // 50/heure
  websocket: { max: 100, windowSec: 3_600  },  // 100/heure
};

// ─── Injection tokens ────────────────────────────────────────────────────────
export const PUSH_QUEUE_TOKEN      = 'BullQueue_notification:push';
export const SMS_QUEUE_TOKEN       = 'BullQueue_notification:sms';
export const EMAIL_QUEUE_TOKEN     = 'BullQueue_notification:email';
export const INAPP_QUEUE_TOKEN     = 'BullQueue_notification:inapp';
export const WEBSOCKET_QUEUE_TOKEN = 'BullQueue_notification:websocket';
