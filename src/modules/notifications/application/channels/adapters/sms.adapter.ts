import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ChannelDeliveryResult,
  INotificationChannelAdapter,
  NotificationJobPayload,
} from '../../../domain/interfaces/notification-job.interface';
import { NotificationChannel } from '../../../domain/entities/notification.entity';

/**
 * SmsAdapter — Envoie un SMS via Twilio ou Orange BF API.
 *
 * Configuration requise (.env) :
 *  SMS_PROVIDER=twilio|orange
 *  TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER
 *  ORANGE_API_URL, ORANGE_API_KEY, ORANGE_SENDER_NAME
 *
 * TODO: yarn add twilio  → remplacer le stub par l'appel réel.
 * Exemple Twilio :
 *   const client  = twilio(accountSid, authToken);
 *   const message = await client.messages.create({ body, from, to: phone });
 *   return { success: true, providerMessageId: message.sid, statusCode: 201 };
 *
 * Limite : corps SMS max 160 chars (ou 153 × N pour les longs messages).
 * Le corps est tronqué automatiquement.
 */
@Injectable()
export class SmsAdapter implements INotificationChannelAdapter {
  readonly channel = NotificationChannel.SMS;
  private readonly logger = new Logger(SmsAdapter.name);
  private readonly maxBodyLength = 160;

  constructor(private readonly config: ConfigService) {}

  async send(payload: NotificationJobPayload): Promise<ChannelDeliveryResult> {
    const start = Date.now();

    if (!payload.recipientPhone) {
      return {
        success: false,
        providerMessageId: null,
        statusCode: 400,
        durationMs: Date.now() - start,
        errorDetail: 'Missing recipient phone',
      };
    }

    const smsBody = `${payload.title}: ${payload.body}`.slice(0, this.maxBodyLength);

    try {
      /**
       * === PRODUCTION STUB ===
       * const provider = this.config.get('SMS_PROVIDER', 'twilio');
       * if (provider === 'twilio') { ... }
       * else if (provider === 'orange') { ... }
       */
      const fakeSid = `SM${Date.now().toString(36).toUpperCase()}`;
      this.logger.debug(
        `[STUB] SMS sent to ${payload.recipientPhone}: ${smsBody.slice(0, 40)}… sid=${fakeSid}`,
      );
      return {
        success: true,
        providerMessageId: fakeSid,
        statusCode: 201,
        durationMs: Date.now() - start,
        errorDetail: null,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`SMS error for notif ${payload.notificationId}: ${msg}`);
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
