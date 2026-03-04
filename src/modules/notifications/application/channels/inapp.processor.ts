import { Logger, Optional } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from 'bullmq';

import { NOTIFICATION_QUEUES } from '../../domain/constants/notification.constants';
import {
  Notification,
  NotificationStatus,
} from '../../domain/entities/notification.entity';
import {
  NotificationDeliveryLog,
  DeliveryStatus,
} from '../../domain/entities/notification-delivery-log.entity';
import { NotificationJobPayload } from '../../domain/interfaces/notification-job.interface';
import { NotificationGateway } from '../../infrastructure/websocket/notification.gateway';

/**
 * InAppProcessor — Worker BullMQ pour les notifications In-App.
 * Pas de provider externe : la notification est déjà en DB.
 * Ce processor :
 *  1. Marque la notification DELIVERED
 *  2. Log la livraison
 *  3. Émet en temps réel via WebSocket (si gateway disponible)
 *
 * Concurrence : 10 (opérations DB rapides).
 */
@Processor(NOTIFICATION_QUEUES.INAPP, { concurrency: 10 })
export class InAppProcessor extends WorkerHost {
  private readonly logger = new Logger(InAppProcessor.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,

    @InjectRepository(NotificationDeliveryLog)
    private readonly deliveryLogRepo: Repository<NotificationDeliveryLog>,

    // Optional → ne casse pas si le gateway n'est pas initialisé
    @Optional()
    private readonly gateway: NotificationGateway,
  ) {
    super();
  }

  async process(job: Job<NotificationJobPayload>): Promise<void> {
    const payload = job.data;
    const attempt = (job.attemptsMade ?? 0) + 1;
    const start   = Date.now();

    this.logger.debug(`InApp job ${job.id} → userId=${payload.userId}`);

    // 1. Marquer comme DELIVERED (déjà en DB depuis enqueue)
    await this.notificationRepo.update(payload.notificationId, {
      status:      NotificationStatus.DELIVERED,
      sentAt:      new Date(),
      deliveredAt: new Date(),
      retryCount:  attempt - 1,
    });

    // 2. Delivery log
    await this.deliveryLogRepo.save(
      this.deliveryLogRepo.create({
        notificationId: payload.notificationId,
        attempt,
        channel:        payload.channel,
        provider:       'internal',
        status:         DeliveryStatus.SUCCESS,
        statusCode:     200,
        durationMs:     Date.now() - start,
      }),
    );

    // 3. Émission WebSocket temps réel
    if (this.gateway) {
      this.gateway.sendToUser(payload.userId, {
        type:           'notification',
        notificationId: payload.notificationId,
        category:       payload.category,
        priority:       payload.priority,
        title:          payload.title,
        body:           payload.body,
        data:           payload.data,
      });
    }
  }
}
