import { IRideRepository } from '../../domain/interfaces/ride-repository.interface';
import { EventBusService } from '../../../../shared/events/event-bus.service';
import { Ride } from '../../domain/entities/ride.entity';
export declare class AcceptRideUseCase {
    private readonly rideRepo;
    private readonly eventBus;
    constructor(rideRepo: IRideRepository, eventBus: EventBusService);
    execute(rideId: string, driverId: string): Promise<Ride>;
}
