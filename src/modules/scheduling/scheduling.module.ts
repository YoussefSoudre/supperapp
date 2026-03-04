import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SchedulingService } from './application/scheduling.service';
import { Ride } from '../rides/domain/entities/ride.entity';
import { QUEUES } from '../rides/application/queues/ride-queues.constants';

/**
 * SchedulingModule — Gestion des courses planifiées.
 *
 * Architecture Cron + BullMQ:
 *   Cron (60s)  → détecte les rides SCHEDULED dans la fenêtre [now, now+16min]
 *   BullMQ      → déclenchement précis à la seconde avec exactly-once
 *
 * Le BullMQ connection est configuré globalement dans AppModule
 * (BullModule.forRootAsync via ConfigService).
 */
@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([Ride]),
    BullModule.registerQueue({ name: QUEUES.SCHEDULED_RIDES }),
  ],
  providers: [SchedulingService],
  exports: [SchedulingService],
})
export class SchedulingModule {}
