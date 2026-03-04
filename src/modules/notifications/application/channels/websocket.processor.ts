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
 * WebSocketProcessor — Worker BullMQ pour le canal WebSocket.
 * Utilisé pour les notifications temps réel pur (ex: live tracking, price updates).
 * Fallback : si le socket du user n'est pas connecté → ignore (no-op).
 *
 * Concurrence : 20 (très rapide, juste un emit Socket.IO).
 */
@Processor(NOTIFICATION_QUEUES.WEBSOCKET, { concurrency: 20 })
export class WebSocketProcessor extends WorkerHost {
  private readonly logger = new Logger(WebSocketProcessor.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,

    @InjectRepository(NotificationDeliveryLog)
    private readonly deliveryLogRepo: Repository<NotificationDeliveryLog>,

    @Optional()
    private readonly gateway: NotificationGateway,
  ) {
    super();
  }

  async process(job: Job<NotificationJobPayload>): Promise<void> {
    const payload = job.data;
    const attempt = (job.attemptsMade ?? 0) + 1;
    const start   = Date.now();

    this.logger.debug(`WS job ${job.id} → userId=${payload.userId}`);

    let delivered = false;

    if (this.gateway) {
      delivered = this.gateway.sendToUser(payload.userId, {
        type:           'notification',
        notificationId: payload.notificationId,
        category:       payload.category,
        priority:       payload.priority,
        title:          payload.title,
        body:           payload.body,
        data:           payload.data,
      });
    }

    const durationMs = Date.now() - start;

    await this.notificationRepo.update(payload.notificationId, {
      status:      delivered ? NotificationStatus.DELIVERED : NotificationStatus.FAILED,
      sentAt:      new Date(),
      deliveredAt: delivered ? new Date() : null,
      retryCount:  attempt - 1,
      failureReason: delivered ? null : 'user_not_connected',
    });

    await this.deliveryLogRepo.save(
      this.deliveryLogRepo.create({
        notificationId: payload.notificationId,
        attempt,
        channel:        payload.channel,
        provider:       'socket.io',
        status:         delivered ? DeliveryStatus.SUCCESS : DeliveryStatus.FAILURE,
        statusCode:     delivered ? 200 : 503,
        durationMs,
        errorDetail:    delivered ? null : 'Socket room empty – user not connected',
      }),
    );
  }
}
