import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ChannelDeliveryResult,
  INotificationChannelAdapter,
  NotificationJobPayload,
} from '../../../domain/interfaces/notification-job.interface';
import { NotificationChannel } from '../../../domain/entities/notification.entity';

/**
 * EmailAdapter — Envoie un email via Nodemailer (SMTP) ou SendGrid.
 *
 * Configuration requise (.env) :
 *  EMAIL_PROVIDER=smtp|sendgrid
 *  SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM
 *  SENDGRID_API_KEY, EMAIL_FROM
 *
 * TODO: yarn add nodemailer @sendgrid/mail → remplacer le stub par l'appel réel.
 *
 * Exemple Nodemailer :
 *   const transporter = createTransport({ host, port, auth: { user, pass } });
 *   const info = await transporter.sendMail({ from, to: email, subject: title, html: body });
 *   return { success: true, providerMessageId: info.messageId, statusCode: 200 };
 *
 * Exemple SendGrid :
 *   sgMail.setApiKey(apiKey);
 *   const [response] = await sgMail.send({ to: email, from, subject: title, html: body });
 *   return { success: true, providerMessageId: response.headers['x-message-id'], statusCode: 202 };
 */
@Injectable()
export class EmailAdapter implements INotificationChannelAdapter {
  readonly channel = NotificationChannel.EMAIL;
  private readonly logger = new Logger(EmailAdapter.name);

  constructor(private readonly config: ConfigService) {}

  async send(payload: NotificationJobPayload): Promise<ChannelDeliveryResult> {
    const start = Date.now();

    if (!payload.recipientEmail) {
      return {
        success: false,
        providerMessageId: null,
        statusCode: 400,
        durationMs: Date.now() - start,
        errorDetail: 'Missing recipient email',
      };
    }

    try {
      /**
       * === PRODUCTION STUB ===
       * const provider = this.config.get('EMAIL_PROVIDER', 'smtp');
       * if (provider === 'smtp') { ... }
       * else if (provider === 'sendgrid') { ... }
       */
      const fakeMessageId = `<${Date.now()}.${Math.random().toString(36).slice(2)}@superapp.bf>`;
      this.logger.debug(
        `[STUB] Email sent to ${payload.recipientEmail} | subject="${payload.title}" msgId=${fakeMessageId}`,
      );
      return {
        success: true,
        providerMessageId: fakeMessageId,
        statusCode: 202,
        durationMs: Date.now() - start,
        errorDetail: null,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Email error for notif ${payload.notificationId}: ${msg}`);
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
