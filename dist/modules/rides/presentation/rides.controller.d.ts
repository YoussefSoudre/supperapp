import { CreateRideUseCase } from '../application/use-cases/create-ride.usecase';
import { AcceptRideUseCase } from '../application/use-cases/accept-ride.usecase';
import { CompleteRideUseCase } from '../application/use-cases/complete-ride.usecase';
import { CreateRideDto } from '../application/dto/create-ride.dto';
import { CancelRideDto, RateRideDto, ModifyRideDto } from '../application/dto/ride-actions.dto';
import { IRideRepository } from '../domain/interfaces/ride-repository.interface';
export declare class RidesController {
    private readonly createRide;
    private readonly acceptRide;
    private readonly completeRide;
    private readonly rideRepo;
    constructor(createRide: CreateRideUseCase, acceptRide: AcceptRideUseCase, completeRide: CompleteRideUseCase, rideRepo: IRideRepository);
    create(req: {
        user: {
            id: string;
            cityId: string;
        };
    }, dto: CreateRideDto): Promise<import("../domain/entities/ride.entity").Ride>;
    list(req: {
        user: {
            id: string;
        };
    }, page?: number, limit?: number): Promise<import("../../../shared/interfaces/repository.interface").PaginatedResult<import("../domain/entities/ride.entity").Ride>>;
    findOne(id: string): Promise<import("../domain/entities/ride.entity").Ride | null>;
    accept(id: string, req: {
        user: {
            id: string;
        };
    }): Promise<import("../domain/entities/ride.entity").Ride>;
    complete(id: string, finalPrice: number): Promise<import("../domain/entities/ride.entity").Ride>;
    cancel(id: string, dto: CancelRideDto): Promise<{
        message: string;
        rideId: string;
        reason: string | undefined;
    }>;
    modify(id: string, dto: ModifyRideDto, req: {
        user: {
            id: string;
        };
    }): Promise<{
        message: string;
        rideId: string;
    }>;
    rate(id: string, dto: RateRideDto): Promise<{
        message: string;
        rideId: string;
        rating: number;
    }>;
}
