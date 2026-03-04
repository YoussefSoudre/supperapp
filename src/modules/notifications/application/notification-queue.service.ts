import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  Notification,
  NotificationChannel,
  NotificationPriority,
  NotificationStatus,
} from '../domain/entities/notification.entity';
import {
  NOTIFICATION_QUEUES,
  BULLMQ_PRIORITY,
  RETRY_CONFIG,
} from '../domain/constants/notification.constants';
import {
  NotificationJobPayload,
  SendNotificationInput,
} from '../domain/interfaces/notification-job.interface';
import { NotificationRateLimiterService } from './notification-rate-limiter.service';

/**
 * NotificationQueueService
 * ─────────────────────────
 * Point d'entrée unique pour envoyer une notification.
 * Responsabilités :
 *  1. Persister la notification en DB (statut QUEUED)
 *  2. Vérifier le rate limit par (userId, channel)
 *  3. Enqueuer le job BullMQ avec la bonne priorité + delay si scheduledAt
 *  4. Mettre à jour queueJobId sur la notification
 */
@Injectable()
export class NotificationQueueService implements OnModuleInit {
  private readonly logger = new Logger(NotificationQueueService.name);

  private queues: Record<NotificationChannel, Queue>;

  constructor(
    @InjectQueue(NOTIFICATION_QUEUES.PUSH)
    private readonly pushQueue: Queue,

    @InjectQueue(NOTIFICATION_QUEUES.SMS)
    private readonly smsQueue: Queue,

    @InjectQueue(NOTIFICATION_QUEUES.EMAIL)
    private readonly emailQueue: Queue,

    @InjectQueue(NOTIFICATION_QUEUES.INAPP)
    private readonly inappQueue: Queue,

    @InjectQueue(NOTIFICATION_QUEUES.WEBSOCKET)
    private readonly wsQueue: Queue,

    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,

    private readonly rateLimiter: NotificationRateLimiterService,
  ) {}

  onModuleInit(): void {
    this.queues = {
      [NotificationChannel.PUSH]:      this.pushQueue,
      [NotificationChannel.SMS]:       this.smsQueue,
      [NotificationChannel.EMAIL]:     this.emailQueue,
      [NotificationChannel.IN_APP]:    this.inappQueue,
      [NotificationChannel.WEBSOCKET]: this.wsQueue,
    };
  }

  /**
   * Envoie une seule notification vers la queue BullMQ appropriée.
   * @returns L'entité Notification créée (avec son ID et jobId).
   */
  async enqueue(input: SendNotificationInput): Promise<Notification> {
    const priority = input.priority ?? NotificationPriority.NORMAL;

    // 1. Rate limit check
    const allowed = await this.rateLimiter.consume(input.userId, input.channel);
    if (!allowed) {
      this.logger.warn(
        `Rate limited: userId=${input.userId} channel=${input.channel}`,
      );
      // Sauvegarde quand même mais marque comme FAILED
      const skipped = this.notificationRepo.create({
        ...this.buildEntityFields(input, priority),
        status: NotificationStatus.FAILED,
        failureReason: 'rate_limit_exceeded',
      });
      return this.notificationRepo.save(skipped);
    }

    // 2. Persist en DB
    const isScheduled  = !!(input.scheduledAt && input.scheduledAt > new Date());
    const notification = this.notificationRepo.create({
      ...this.buildEntityFields(input, priority),
      status: isScheduled ? NotificationStatus.SCHEDULED : NotificationStatus.QUEUED,
    });
    const saved = await this.notificationRepo.save(notification);

    // 3. Calcul du delay si scheduledAt
    const delay = isScheduled
      ? input.scheduledAt!.getTime() - Date.now()
      : 0;

    // 4. Enqueue dans BullMQ
    const queue = this.queues[input.channel];
    if (!queue) {
      this.logger.error(`No queue registered for channel: ${input.channel}`);
      return saved;
    }

    const jobPayload: NotificationJobPayload = {
      notificationId: saved.id,
      userId:         saved.userId,
      channel:        saved.channel,
      category:       saved.category,
      priority:       saved.priority,
      title:          saved.title,
      body:           saved.body,
      data:           saved.data,
      cityId:         saved.cityId,
      targetRole:     saved.targetRole,
      deviceToken:    saved.deviceToken,
      recipientEmail: saved.recipientEmail,
      recipientPhone: saved.recipientPhone,
      attempt:        1,
    };

    const job = await queue.add(
      `notify:${input.channel}`,
      jobPayload,
      {
        priority: BULLMQ_PRIORITY[priority],
        delay,
        attempts: RETRY_CONFIG.maxAttempts,
        backoff: { type: RETRY_CONFIG.backoffType, delay: RETRY_CONFIG.backoffDelayMs },
        removeOnComplete: RETRY_CONFIG.removeOnComplete,
        removeOnFail:     RETRY_CONFIG.removeOnFail,
      },
    );

    // 5. Stocker le jobId pour pouvoir annuler si nécessaire
    await this.notificationRepo.update(saved.id, { queueJobId: String(job.id) });
    saved.queueJobId = String(job.id);

    this.logger.debug(
      `Enqueued ${input.channel} notif #${saved.id} → jobId=${job.id} (delay=${delay}ms, prio=${priority})`,
    );
    return saved;
  }

  /**
   * Envoie plusieurs notifications en bulk (ex: broadcast).
   * Utilise addBulk de BullMQ pour une seule transaction Redis.
   */
  async enqueueBulk(inputs: SendNotificationInput[]): Promise<void> {
    if (inputs.length === 0) return;

    // Regrouper par channel
    const byChannel = new Map<NotificationChannel, SendNotificationInput[]>();
    for (const input of inputs) {
      if (!byChannel.has(input.channel)) byChannel.set(input.channel, []);
      byChannel.get(input.channel)!.push(input);
    }

    for (const [channel, channelInputs] of byChannel) {
      const queue = this.queues[channel];
      if (!queue) continue;

      // Sauvegarde batch
      const entities = channelInputs.map((i) =>
        this.notificationRepo.create({
          ...this.buildEntityFields(i, i.priority ?? NotificationPriority.NORMAL),
          status: NotificationStatus.QUEUED,
        }),
      );
      const saved = await this.notificationRepo.save(entities);

      const jobs = saved.map((n, idx) => {
        const input = channelInputs[idx];
        const priority = input.priority ?? NotificationPriority.NORMAL;
        return {
          name: `notify:${channel}`,
          data: {
            notificationId: n.id,
            userId:         n.userId,
            channel:        n.channel,
            category:       n.category,
            priority:       n.priority,
            title:          n.title,
            body:           n.body,
            data:           n.data,
            cityId:         n.cityId,
            targetRole:     n.targetRole,
            deviceToken:    n.deviceToken,
            recipientEmail: n.recipientEmail,
            recipientPhone: n.recipientPhone,
            attempt:        1,
          } as NotificationJobPayload,
          opts: {
            priority: BULLMQ_PRIORITY[priority],
            attempts: RETRY_CONFIG.maxAttempts,
            backoff:  { type: RETRY_CONFIG.backoffType, delay: RETRY_CONFIG.backoffDelayMs },
            removeOnComplete: RETRY_CONFIG.removeOnComplete,
            removeOnFail:     RETRY_CONFIG.removeOnFail,
          },
        };
      });

      await queue.addBulk(jobs);
      this.logger.debug(`Bulk enqueued ${jobs.length} ${channel} notifications`);
    }
  }

  /** Annule une notification schedulée (supprime le job BullMQ). */
  async cancel(notificationId: string): Promise<boolean> {
    const notif = await this.notificationRepo.findOneBy({ id: notificationId });
    if (!notif || !notif.queueJobId) return false;

    const queue = this.queues[notif.channel];
    if (!queue) return false;

    try {
      const job = await queue.getJob(notif.queueJobId);
      if (job) await job.remove();
      await this.notificationRepo.update(notificationId, {
        status: NotificationStatus.CANCELLED,
      });
      return true;
    } catch {
      return false;
    }
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  private buildEntityFields(
    input: SendNotificationInput,
    priority: NotificationPriority,
  ): Partial<Notification> {
    return {
      userId:         input.userId,
      channel:        input.channel,
      category:       input.category,
      title:          input.title,
      body:           input.body,
      priority,
      data:           input.data ?? null,
      cityId:         input.cityId ?? null,
      targetRole:     input.targetRole ?? null,
      deviceToken:    input.deviceToken ?? null,
      recipientEmail: input.recipientEmail ?? null,
      recipientPhone: input.recipientPhone ?? null,
      scheduledAt:    input.scheduledAt ?? null,
    };
  }
}
