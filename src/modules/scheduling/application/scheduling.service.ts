import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThanOrEqual, Between } from 'typeorm';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { DomainEvents } from '../../../shared/events/domain-events.constants';
import { Ride, RideStatus } from '../../rides/domain/entities/ride.entity';
import { QUEUES, JOBS } from '../../rides/application/queues/ride-queues.constants';

/**
 * SchedulingService — Orchestrateur des courses planifiées.
 *
 * Stratégie Cron + BullMQ :
 *   Cron 60s = polling grossier pour détecter les rides à déclencher
 *   BullMQ delayed job = déclenchement précis à la seconde
 *
 * Pourquoi BullMQ et pas Cron seul ?
 *   • Cron granularité minimum = 1 minute
 *   • Cron + multi-instances = double déclenchement
 *   • BullMQ garantit exactly-once via Consumer Group Redis
 *   • BullMQ gère le retry si le worker est down au moment du déclenchement
 *
 * Redis key de dédoublonnage : scheduled-rides:{rideId} TTL auto-expire
 */
@Injectable()
export class SchedulingService {
  private readonly logger = new Logger(SchedulingService.name);

  /** Fenêtre de planification : rides dont scheduledAt est dans [now, now+WINDOW] */
  private readonly SCHEDULING_WINDOW_MS = 16 * 60 * 1000; // 16 minutes

  constructor(
    @InjectRepository(Ride)
    private readonly rideRepo: Repository<Ride>,
    @InjectQueue(QUEUES.SCHEDULED_RIDES)
    private readonly scheduledRidesQueue: Queue,
    private readonly eventBus: EventBusService,
  ) {}

  /**
   * Cron toutes les minutes — scan les rides SCHEDULED dont scheduledAt
   * est dans la fenêtre [now, now+16min] et enqueue un delayed BullMQ job.
   *
   * Dédoublonnage : job id = ride-{rideId} → BullMQ rejette le duplicata.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async processPendingScheduledRides(): Promise<void> {
    const now     = new Date();
    const horizon = new Date(now.getTime() + this.SCHEDULING_WINDOW_MS);

    const rides = await this.rideRepo.find({
      where: {
        status: RideStatus.SCHEDULED,
        scheduledAt: Between(now, horizon),
      },
    });

    if (!rides.length) return;

    this.logger.log(`Found ${rides.length} scheduled ride(s) to enqueue`);

    for (const ride of rides) {
      const delayMs = Math.max(0, ride.scheduledAt!.getTime() - Date.now() - 60_000); // 1min avant

      try {
        await this.scheduledRidesQueue.add(
          JOBS.TRIGGER_SCHEDULED_RIDE,
          {
            rideId:     ride.id,
            userId:     ride.userId,
            cityId:     ride.cityId,
            pickupLat:  Number(ride.pickupLat),
            pickupLng:  Number(ride.pickupLng),
            type:       ride.type,
          },
          {
            jobId:   `ride-${ride.id}`,          // Dédoublonnage BullMQ (unique par ride)
            delay:   delayMs,
            attempts: 3,
            backoff: { type: 'exponential', delay: 5000 },
            removeOnComplete: { age: 3600 },     // garder 1h pour audit
            removeOnFail:     { count: 5 },
          },
        );
        this.logger.debug(`Enqueued ride ${ride.id} (delay: ${Math.round(delayMs / 60000)}min)`);
      } catch (err: any) {
        // Job déjà en file (jobId duplicate) → OK
        if (err?.message?.includes('already exists')) {
          this.logger.debug(`Ride ${ride.id} already enqueued, skipping`);
        } else {
          this.logger.error(`Failed to enqueue ride ${ride.id}`, err);
        }
      }
    }
  }

  /**
   * Cron toutes les heures — Annuler les rides SCHEDULED dont scheduledAt
   * est dépassé depuis plus de 30 minutes et qui n'ont pas été traités.
   * (Safety net en cas de crash perthé du worker BullMQ)
   */
  @Cron(CronExpression.EVERY_HOUR)
  async cancelStaleScheduledRides(): Promise<void> {
    const cutoff = new Date(Date.now() - 30 * 60 * 1000); // 30 min passé
    const stale = await this.rideRepo.find({
      where: {
        status:      RideStatus.SCHEDULED,
        scheduledAt: LessThanOrEqual(cutoff),
      },
    });

    for (const ride of stale) {
      this.logger.warn(`Cancelling stale scheduled ride ${ride.id}`);
      await this.rideRepo.update(ride.id, {
        status:             RideStatus.CANCELLED,
        cancelledAt:        new Date(),
        cancelledBy:        'system' as any,
        cancellationReason: 'Missed scheduled trigger (system safety net)',
      });
      await this.eventBus.emit(DomainEvents.RIDE_CANCELLED, {
        version: 1,
        rideId: ride.id,
        userId: ride.userId,
        reason: 'stale_scheduled',
        timestamp: new Date(),
      } as any);
    }
  }

  /**
   * Tous les jours à minuit — consolidation des statistiques quotidiennes.
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async dailyConsolidation(): Promise<void> {
    this.logger.log('Running daily stats consolidation...');
    // TODO: InjectRepository(Analytics) et agréger via AnalyticsService
  }
}
