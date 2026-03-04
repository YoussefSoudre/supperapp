import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User, UserStatus } from '../../users/domain/entities/user.entity';
import {
  BroadcastNotification,
  BroadcastStatus,
} from '../domain/entities/broadcast-notification.entity';
import {
  NotificationCategory,
  NotificationChannel,
  NotificationPriority,
} from '../domain/entities/notification.entity';
import { NotificationQueueService } from './notification-queue.service';
import { SendNotificationInput } from '../domain/interfaces/notification-job.interface';
import { NotificationGateway } from '../infrastructure/websocket/notification.gateway';

export interface BroadcastInput {
  createdBy:    string;
  targetCityId: string | null;
  targetRole:   string | null;
  title:        string;
  body:         string;
  channels:     NotificationChannel[];
  category:     NotificationCategory;
  priority?:    NotificationPriority;
  data?:        Record<string, unknown>;
  filters?:     Record<string, unknown>;
  scheduledAt?: Date;
}

/**
 * BroadcastService
 * ─────────────────
 * Envoie des notifications de masse à une ville ou un rôle.
 * Stratégie : batch de 500 utilisateurs → enqueueBulk BullMQ.
 *
 * Scalabilité :
 *  - 2M users / BullMQ + Redis = ~10M jobs/heure possible
 *  - enqueueBulk utilise Redis pipeline (1 round-trip par batch)
 *  - Les jobs sont distribués à travers N workers en concurrence
 *
 * TODO: si userType/role est ajouté à l'entité User, mettre à jour
 * buildUserQuery() pour filtrer par rôle directement en SQL.
 */
@Injectable()
export class BroadcastService {
  private readonly logger     = new Logger(BroadcastService.name);
  private readonly BATCH_SIZE = 500;

  constructor(
    @InjectRepository(BroadcastNotification)
    private readonly broadcastRepo: Repository<BroadcastNotification>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    private readonly queueService: NotificationQueueService,
    private readonly gateway: NotificationGateway,
  ) {}

  /**
   * Lance un broadcast asynchrone.
   * @returns broadcastId créé.
   */
  async send(input: BroadcastInput): Promise<string> {
    // 1. Créer l'enregistrement broadcast
    const broadcast = await this.broadcastRepo.save(
      this.broadcastRepo.create({
        createdBy:    input.createdBy,
        targetCityId: input.targetCityId,
        targetRole:   input.targetRole,
        title:        input.title,
        body:         input.body,
        data:         input.data ?? null,
        channels:     input.channels,
        filters:      input.filters ?? null,
        status:       BroadcastStatus.PENDING,
        scheduledAt:  input.scheduledAt ?? null,
      }),
    );

    // 2. Si schedulé dans le futur, on attend le scheduler
    if (input.scheduledAt && input.scheduledAt > new Date()) {
      this.logger.log(`Broadcast ${broadcast.id} scheduled for ${input.scheduledAt}`);
      return broadcast.id;
    }

    // 3. Exécution immédiate (en arrière-plan, non bloquant)
    void this.executeBroadcast(broadcast, input);
    return broadcast.id;
  }

  /**
   * Exécution réelle du broadcast (peut être appelé par un scheduler aussi).
   */
  async executeBroadcast(
    broadcast: BroadcastNotification,
    input: BroadcastInput,
  ): Promise<void> {
    await this.broadcastRepo.update(broadcast.id, {
      status:    BroadcastStatus.PROCESSING,
      startedAt: new Date(),
    });

    try {
      let offset        = 0;
      let totalCount    = 0;
      let successCount  = 0;
      let failedCount   = 0;

      while (true) {
        const users = await this.fetchUsersBatch(
          input.targetCityId,
          input.targetRole,
          offset,
        );
        if (users.length === 0) break;

        totalCount += users.length;

        // Construire les inputs pour chaque user × channel
        const jobInputs: SendNotificationInput[] = [];
        for (const user of users) {
          for (const channel of input.channels) {
            jobInputs.push({
              userId:          user.id,
              channel,
              category:        input.category,
              title:           input.title,
              body:            input.body,
              priority:        input.priority ?? NotificationPriority.NORMAL,
              data:            input.data,
              cityId:          user.cityId,
              targetRole:      input.targetRole ?? undefined,
              deviceToken:     channel === NotificationChannel.PUSH ? (user.fcmToken ?? undefined) : undefined,
              recipientEmail:  channel === NotificationChannel.EMAIL ? (user.email ?? undefined) : undefined,
              recipientPhone:  channel === NotificationChannel.SMS ? user.phone : undefined,
            });
          }
        }

        try {
          await this.queueService.enqueueBulk(jobInputs);
          successCount += users.length;
        } catch (err) {
          failedCount += users.length;
          this.logger.error(`Batch offset=${offset} failed: ${err}`);
        }

        // WebSocket temps réel pour les connectés
        if (input.channels.includes(NotificationChannel.WEBSOCKET)) {
          const wsPayload = {
            type:        'broadcast',
            broadcastId: broadcast.id,
            category:    input.category,
            title:       input.title,
            body:        input.body,
            data:        input.data ?? null,
          };
          if (input.targetCityId) {
            this.gateway.sendToCity(input.targetCityId, wsPayload);
          } else if (input.targetRole) {
            this.gateway.sendToRole(input.targetRole, wsPayload);
          } else {
            this.gateway.broadcast(wsPayload);
          }
        }

        offset += this.BATCH_SIZE;

        // Mise à jour progressive
        await this.broadcastRepo.update(broadcast.id, {
          totalRecipients: totalCount,
          sentCount:       successCount,
          failedCount,
        });

        if (users.length < this.BATCH_SIZE) break; // dernière page
      }

      await this.broadcastRepo.update(broadcast.id, {
        status:          BroadcastStatus.COMPLETED,
        completedAt:     new Date(),
        totalRecipients: totalCount,
        sentCount:       successCount,
        failedCount,
      });

      this.logger.log(
        `Broadcast ${broadcast.id} completed: ${successCount} sent, ${failedCount} failed`,
      );
    } catch (err) {
      await this.broadcastRepo.update(broadcast.id, {
        status: BroadcastStatus.FAILED,
      });
      this.logger.error(`Broadcast ${broadcast.id} failed: ${err}`);
    }
  }

  async getStatus(broadcastId: string): Promise<BroadcastNotification | null> {
    return this.broadcastRepo.findOneBy({ id: broadcastId });
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private async fetchUsersBatch(
    cityId: string | null,
    role: string | null,
    offset: number,
  ): Promise<User[]> {
    const qb = this.userRepo
      .createQueryBuilder('u')
      .select([
        'u.id',
        'u.cityId',
        'u.email',
        'u.phone',
        'u.fcmToken',
      ])
      .where('u.status = :status', { status: UserStatus.ACTIVE })
      .andWhere('u.deletedAt IS NULL')
      .take(this.BATCH_SIZE)
      .skip(offset);

    if (cityId) {
      qb.andWhere('u.cityId = :cityId', { cityId });
    }

    /**
     * TODO: filtrage par rôle
     * Si un champ `userType` ou `role` est ajouté à l'entité User :
     *   if (role) qb.andWhere('u.role = :role', { role });
     * Pour l'instant, le metadata peut être utilisé :
     *   if (role) qb.andWhere("u.metadata->>'userType' = :role", { role });
     */
    if (role && role !== 'all') {
      qb.andWhere("u.metadata->>'userType' = :role", { role });
    }

    return qb.getMany();
  }
}
