import {
  NotificationCategory,
  NotificationChannel,
  NotificationPriority,
} from '../entities/notification.entity';

// ─── Job payload stored in BullMQ ────────────────────────────────────────────
export interface NotificationJobPayload {
  notificationId:  string;
  userId:          string;
  channel:         NotificationChannel;
  category:        NotificationCategory;
  priority:        NotificationPriority;
  title:           string;
  body:            string;
  data:            Record<string, unknown> | null;
  cityId:          string | null;
  targetRole:      string | null;
  deviceToken:     string | null;
  recipientEmail:  string | null;
  recipientPhone:  string | null;
  attempt:         number;
}

// ─── Input for sending a notification ────────────────────────────────────────
export interface SendNotificationInput {
  userId:          string;
  channel:         NotificationChannel;
  category:        NotificationCategory;
  title:           string;
  body:            string;
  priority?:       NotificationPriority;
  data?:           Record<string, unknown>;
  cityId?:         string;
  targetRole?:     string;
  deviceToken?:    string;
  recipientEmail?: string;
  recipientPhone?: string;
  scheduledAt?:    Date;
}

// ─── Result returned by channel adapters ────────────────────────────────────
export interface ChannelDeliveryResult {
  success:           boolean;
  providerMessageId: string | null;
  statusCode:        number | null;
  durationMs:        number;
  errorDetail:       string | null;
}

// ─── Channel adapter contract ────────────────────────────────────────────────
export interface INotificationChannelAdapter {
  readonly channel: NotificationChannel;
  send(payload: NotificationJobPayload): Promise<ChannelDeliveryResult>;
}
