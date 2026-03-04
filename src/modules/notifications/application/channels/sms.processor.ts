import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';

import { NOTIFICATION_QUEUES } from '../../domain/constants/notification.constants';
import { NotificationJobPayload } from '../../domain/interfaces/notification-job.interface';
import { SmsAdapter } from './adapters/sms.adapter';
import { NotificationDeliveryHelper } from './notification-delivery.helper';

/**
 * SmsProcessor — Worker BullMQ pour le canal SMS.
 * Concurrence : 3 (throttlé pour respecter les quotas Twilio/Orange).
 */
@Processor(NOTIFICATION_QUEUES.SMS, { concurrency: 3 })
export class SmsProcessor extends WorkerHost {
  private readonly logger = new Logger(SmsProcessor.name);

  constructor(
    private readonly adapter: SmsAdapter,
    private readonly delivery: NotificationDeliveryHelper,
  ) {
    super();
  }

  async process(job: Job<NotificationJobPayload>): Promise<void> {
    this.logger.debug(`SMS job ${job.id} → phone=${job.data.recipientPhone}`);
    const result = await this.adapter.send(job.data);
    await this.delivery.handleResult(job, result, 'SMS');
  }
}
