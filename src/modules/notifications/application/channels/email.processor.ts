import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';

import { NOTIFICATION_QUEUES } from '../../domain/constants/notification.constants';
import { NotificationJobPayload } from '../../domain/interfaces/notification-job.interface';
import { EmailAdapter } from './adapters/email.adapter';
import { NotificationDeliveryHelper } from './notification-delivery.helper';

/**
 * EmailProcessor — Worker BullMQ pour le canal Email (SMTP / SendGrid).
 * Concurrence : 5 workers.
 */
@Processor(NOTIFICATION_QUEUES.EMAIL, { concurrency: 5 })
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(
    private readonly adapter: EmailAdapter,
    private readonly delivery: NotificationDeliveryHelper,
  ) {
    super();
  }

  async process(job: Job<NotificationJobPayload>): Promise<void> {
    this.logger.debug(`Email job ${job.id} → to=${job.data.recipientEmail}`);
    const result = await this.adapter.send(job.data);
    await this.delivery.handleResult(job, result, 'Email');
  }
}
