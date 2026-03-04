import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';

import { NOTIFICATION_QUEUES } from '../../domain/constants/notification.constants';
import { NotificationJobPayload } from '../../domain/interfaces/notification-job.interface';
import { PushAdapter } from './adapters/push.adapter';
import { NotificationDeliveryHelper } from './notification-delivery.helper';

/**
 * PushProcessor
 * Worker BullMQ pour le canal Push (FCM / Expo).
 * Concurrence : 5 workers simultanés.
 */
@Processor(NOTIFICATION_QUEUES.PUSH, { concurrency: 5 })
export class PushProcessor extends WorkerHost {
  private readonly logger = new Logger(PushProcessor.name);

  constructor(
    private readonly adapter: PushAdapter,
    private readonly delivery: NotificationDeliveryHelper,
  ) {
    super();
  }

  async process(job: Job<NotificationJobPayload>): Promise<void> {
    this.logger.debug(`Push job ${job.id} → userId=${job.data.userId}`);
    const result = await this.adapter.send(job.data);
    await this.delivery.handleResult(job, result, 'FCM');
  }
}
