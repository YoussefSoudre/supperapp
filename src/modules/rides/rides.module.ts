import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { Ride } from './domain/entities/ride.entity';
import { RideModificationLog } from './domain/entities/ride-modification-log.entity';
import { RIDE_REPOSITORY } from './domain/interfaces/ride-repository.interface';
import { RideRepository } from './infrastructure/repositories/ride.repository';
import { CreateRideUseCase } from './application/use-cases/create-ride.usecase';
import { AcceptRideUseCase } from './application/use-cases/accept-ride.usecase';
import { CompleteRideUseCase } from './application/use-cases/complete-ride.usecase';
import { CancelRideUseCase } from './application/use-cases/cancel-ride.usecase';
import { RateRideUseCase } from './application/use-cases/rate-ride.usecase';
import { ModifyRideBeforeDepartureUseCase } from './application/use-cases/modify-ride-before-departure.usecase';
import { ModifyRideEnRouteUseCase } from './application/use-cases/modify-ride-enroute.usecase';
import { ScheduledRidesWorker } from './application/workers/scheduled-rides.worker';
import { RideModificationWorker } from './application/workers/ride-modification.worker';
import { QUEUES } from './application/queues/ride-queues.constants';
import { Driver } from '../drivers/domain/entities/driver.entity';
import { RidesController } from './presentation/rides.controller';
import { RidesGateway } from './presentation/rides.gateway';

/**
 * RidesModule — autonome, zéro dépendance vers d'autres modules métier.
 * Communication externe = events uniquement (via SharedModule global).
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Ride, RideModificationLog, Driver]),
    BullModule.registerQueue(
      { name: QUEUES.SCHEDULED_RIDES },
      { name: QUEUES.RIDE_MODIFICATION },
    ),
  ],
  controllers: [RidesController],
  providers: [
    // Infrastructure adapter (binding Port → Adapter)
    { provide: RIDE_REPOSITORY, useClass: RideRepository },

    // Use cases
    CreateRideUseCase,
    AcceptRideUseCase,
    CompleteRideUseCase,
    CancelRideUseCase,
    RateRideUseCase,
    ModifyRideBeforeDepartureUseCase,
    ModifyRideEnRouteUseCase,

    // BullMQ Workers
    ScheduledRidesWorker,
    RideModificationWorker,

    // WebSocket
    RidesGateway,
  ],
  exports: [RIDE_REPOSITORY],
})
export class RidesModule {}
