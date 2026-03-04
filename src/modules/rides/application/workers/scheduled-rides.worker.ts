import { Injectable, Logger } from '@nestjs/common';
import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { EventBusService } from '../../../../shared/events/event-bus.service';
import { DomainEvents } from '../../../../shared/events/domain-events.constants';
import { Ride, RideStatus } from '../../domain/entities/ride.entity';
import { QUEUES, JOBS, TriggerScheduledRideJob } from '../queues/ride-queues.constants';

/**
 * ScheduledRidesWorker — Processeur BullMQ pour les courses planifiées.
 *
 * Avantages par rapport à Cron pur:
 *   1. Retry automatique si le worker crash
 *   2. Exactly-once via Redis lock BullMQ (pas de double déclenchement)
 *   3. Délai précis à la seconde (Cron = granularité 1 minute)
 *   4. Dashboard BullMQ pour monitorer les jobs
 *   5. Backoff exponentiel en cas d'erreur Redis/DB
 *
 * Flow:
 *   SchedulingService (Cron/1min) lira les rides SCHEDULED dans la fenêtre
 *   [now, now+16min] et ajoutera un delayed job pour chacun.
 *   Ce worker reçoit le job à l'heure scheduledAt - 1min (pré-chauffe dispatch)
 *   et change le statut en SEARCHING avant d'émettre RIDE_REQUESTED.
 */
@Processor(QUEUES.SCHEDULED_RIDES)
@Injectable()
export class ScheduledRidesWorker extends WorkerHost {
  private readonly logger = new Logger(ScheduledRidesWorker.name);

  constructor(
    @InjectRepository(Ride)
    private readonly rideRepo: Repository<Ride>,
    private readonly eventBus: EventBusService,
  ) {
    super();
  }

  async process(job: Job<TriggerScheduledRideJob>): Promise<void> {
    const { name, data } = job;

    switch (name) {
      case JOBS.TRIGGER_SCHEDULED_RIDE:
        await this.triggerScheduledRide(data);
        break;
      default:
        this.logger.warn(`Unknown job type: ${name}`);
    }
  }

  // ─── Déclencher une course planifiée ────────────────────────────────────────

  private async triggerScheduledRide(data: TriggerScheduledRideJob): Promise<void> {
    this.logger.log(`Triggering scheduled ride ${data.rideId}`);

    // Re-vérifier l'état du ride (il peut avoir été annulé entretemps)
    const ride = await this.rideRepo.findOne({ where: { id: data.rideId } });

    if (!ride) {
      this.logger.warn(`Ride ${data.rideId} not found, skipping`);
      return;
    }

    // ── Edge case : ride annulé ou déjà traité avant le déclenchement ─────────
    if (ride.status !== RideStatus.SCHEDULED) {
      this.logger.warn(
        `Ride ${data.rideId} is no longer SCHEDULED (status: ${ride.status}), skipping`
      );
      return;
    }

    // ── Edge case : déclenchement tardif (worker down > 1h) ──────────────────
    // Si le scheduledAt est passé depuis plus de 30 minutes → annuler
    if (ride.scheduledAt) {
      const overdueMs = Date.now() - ride.scheduledAt.getTime();
      if (overdueMs > 30 * 60 * 1000) {
        this.logger.error(
          `Ride ${data.rideId} is overdue by ${Math.round(overdueMs / 60000)}min, cancelling`
        );
        await this.rideRepo.update(data.rideId, {
          status: RideStatus.CANCELLED,
          cancelledAt: new Date(),
          cancellationReason: 'Automated cancellation: triggered more than 30 minutes late',
          cancelledBy: 'system' as any,
        });

        await this.eventBus.emit(DomainEvents.RIDE_CANCELLED, {
          version: 1,
          rideId: data.rideId,
          userId: data.userId,
          reason: 'scheduled_trigger_overdue',
          timestamp: new Date(),
        });
        return;
      }
    }

    // ── Passer en SEARCHING et lancer le dispatch ──────────────────────────────
    await this.rideRepo.update(data.rideId, {
      status: RideStatus.SEARCHING,
    });

    await this.eventBus.emit(DomainEvents.SCHEDULED_RIDE_TRIGGERED, {
      version: 1,
      rideId: data.rideId,
      userId: data.userId,
      cityId: data.cityId,
      scheduledAt: ride.scheduledAt ?? new Date(),
      timestamp: new Date(),
    });

    // Émettre RIDE_REQUESTED pour le DispatchService
    await this.eventBus.emit(DomainEvents.RIDE_REQUESTED, {
      version: 1,
      rideId: data.rideId,
      userId: data.userId,
      cityId: data.cityId,
      pickupLat: data.pickupLat,
      pickupLng: data.pickupLng,
      type: data.type,
      timestamp: new Date(),
    });

    this.logger.log(`Scheduled ride ${data.rideId} triggered successfully`);
  }

  // ─── Événements du worker ────────────────────────────────────────────────────

  @OnWorkerEvent('completed')
  onCompleted(job: Job): void {
    this.logger.debug(`Job ${job.id} (${job.name}) completed`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error): void {
    this.logger.error(`Job ${job.id} (${job.name}) failed: ${error.message}`);
  }
}
