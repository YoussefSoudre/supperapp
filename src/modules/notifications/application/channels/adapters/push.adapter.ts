import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ChannelDeliveryResult,
  INotificationChannelAdapter,
  NotificationJobPayload,
} from '../../../domain/interfaces/notification-job.interface';
import { NotificationChannel } from '../../../domain/entities/notification.entity';

/**
 * PushAdapter — Envoie une notification Push via Firebase Cloud Messaging (FCM).
 *
 * Configuration requise (.env) :
 *  FCM_PROJECT_ID, FCM_PRIVATE_KEY, FCM_CLIENT_EMAIL
 *
 * TODO: yarn add firebase-admin  →  remplacer le stub par l'appel réel.
 * Exemple d'intégration réelle :
 *   import * as admin from 'firebase-admin';
 *   const message = { notification: { title, body }, token: deviceToken, data };
 *   const result  = await admin.messaging().send(message);
 */
@Injectable()
export class PushAdapter implements INotificationChannelAdapter {
  readonly channel = NotificationChannel.PUSH;
  private readonly logger = new Logger(PushAdapter.name);

  constructor(private readonly config: ConfigService) {}

  async send(payload: NotificationJobPayload): Promise<ChannelDeliveryResult> {
    const start = Date.now();

    if (!payload.deviceToken) {
      return {
        success: false,
        providerMessageId: null,
        statusCode: 400,
        durationMs: Date.now() - start,
        errorDetail: 'Missing device token',
      };
    }

    try {
      /**
       * === PRODUCTION STUB ===
       * Remplacer par l'appel firebase-admin réel :
       *
       * const message: admin.messaging.Message = {
       *   notification: { title: payload.title, body: payload.body },
       *   data: payload.data ? mapToStringRecord(payload.data) : {},
       *   token: payload.deviceToken,
       *   android: { priority: mapPriority(payload.priority) },
       *   apns: { headers: { 'apns-priority': '10' } },
       * };
       * const messageId = await admin.messaging().send(message);
       * return { success: true, providerMessageId: messageId, statusCode: 200, … };
       */
      const fakeMessageId = `fcm:${Date.now()}-${Math.random().toString(36).slice(2)}`;
      this.logger.debug(
        `[STUB] Push sent to token=${payload.deviceToken.slice(0, 12)}… msgId=${fakeMessageId}`,
      );
      return {
        success: true,
        providerMessageId: fakeMessageId,
        statusCode: 200,
        durationMs: Date.now() - start,
        errorDetail: null,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`FCM error for notif ${payload.notificationId}: ${msg}`);
      return {
        success: false,
        providerMessageId: null,
        statusCode: 500,
        durationMs: Date.now() - start,
        errorDetail: msg,
      };
    }
  }
}
