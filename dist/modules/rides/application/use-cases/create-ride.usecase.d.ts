import { IRideRepository } from '../../domain/interfaces/ride-repository.interface';
import { CreateRideDto } from '../dto/create-ride.dto';
import { EventBusService } from '../../../../shared/events/event-bus.service';
import { Ride } from '../../domain/entities/ride.entity';
export declare class CreateRideUseCase {
    private readonly rideRepo;
    private readonly eventBus;
    constructor(rideRepo: IRideRepository, eventBus: EventBusService);
    execute(userId: string, cityId: string, dto: CreateRideDto): Promise<Ride>;
}
