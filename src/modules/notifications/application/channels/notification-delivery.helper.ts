import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from 'bullmq';

import {
  Notification,
  NotificationStatus,
} from '../../domain/entities/notification.entity';
import {
  NotificationDeliveryLog,
  DeliveryStatus,
} from '../../domain/entities/notification-delivery-log.entity';
import {
  ChannelDeliveryResult,
  NotificationJobPayload,
} from '../../domain/interfaces/notification-job.interface';

/**
 * NotificationDeliveryHelper
 * ───────────────────────────
 * Service injectable partagé par tous les processors.
 * Encapsule la logique commune :
 *  - Enregistrement du delivery log
 *  - Mise à jour du statut Notification
 *  - Gestion retry / failure définitive
 */
@Injectable()
export class NotificationDeliveryHelper {
  private readonly logger = new Logger(NotificationDeliveryHelper.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,

    @InjectRepository(NotificationDeliveryLog)
    private readonly deliveryLogRepo: Repository<NotificationDeliveryLog>,
  ) {}

  /**
   * À appeler depuis chaque processor après l'appel à l'adapter.
   * @throws Error si échec non définitif → BullMQ relance le job.
   */
  async handleResult(
    job: Job<NotificationJobPayload>,
    result: ChannelDeliveryResult,
    providerName: string,
  ): Promise<void> {
    const payload = job.data;
    const attempt = (job.attemptsMade ?? 0) + 1;

    // 1. Delivery log
    await this.deliveryLogRepo.save(
      this.deliveryLogRepo.create({
        notificationId:    payload.notificationId,
        attempt,
        channel:           payload.channel,
        provider:          providerName,
        status:            result.success ? DeliveryStatus.SUCCESS : DeliveryStatus.FAILURE,
        statusCode:        result.statusCode,
        providerMessageId: result.providerMessageId,
        errorDetail:       result.errorDetail,
        durationMs:        result.durationMs,
      }),
    );

    // 2. Notification update
    if (result.success) {
      await this.notificationRepo.update(payload.notificationId, {
        status:            NotificationStatus.DELIVERED,
        providerMessageId: result.providerMessageId,
        sentAt:            new Date(),
        deliveredAt:       new Date(),
        retryCount:        attempt - 1,
        failureReason:     null,
      });
    } else {
      const maxAttempts = job.opts?.attempts ?? 3;
      const isFinal     = attempt >= maxAttempts;

      await this.notificationRepo.update(payload.notificationId, {
        status:        isFinal ? NotificationStatus.FAILED : NotificationStatus.QUEUED,
        retryCount:    attempt,
        failureReason: result.errorDetail,
        nextRetryAt:   isFinal ? null : this.calcNextRetry(attempt),
      });

      if (!isFinal) {
        throw new Error(`[attempt ${attempt}] ${result.errorDetail}`);
      }

      this.logger.warn(
        `Notification ${payload.notificationId} permanently failed (${attempt} attempts)`,
      );
    }
  }

  private calcNextRetry(attempt: number): Date {
    const delayMs = 5_000 * Math.pow(5, attempt - 1);
    return new Date(Date.now() + delayMs);
  }
}
