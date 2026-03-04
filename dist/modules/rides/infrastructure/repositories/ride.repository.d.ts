import { Repository } from 'typeorm';
import { Ride } from '../../domain/entities/ride.entity';
import { IRideRepository } from '../../domain/interfaces/ride-repository.interface';
import { FindAllOptions, PaginatedResult } from '../../../../shared/interfaces/repository.interface';
export declare class RideRepository implements IRideRepository {
    private readonly repo;
    constructor(repo: Repository<Ride>);
    findById(id: string): Promise<Ride | null>;
    findByUserId(userId: string, options?: FindAllOptions): Promise<PaginatedResult<Ride>>;
    findByDriverId(driverId: string, options?: FindAllOptions): Promise<PaginatedResult<Ride>>;
    findPendingScheduled(before: Date): Promise<Ride[]>;
    save(rideData: Omit<Ride, 'id' | 'createdAt' | 'updatedAt'>): Promise<Ride>;
    update(id: string, data: Partial<Ride>): Promise<Ride>;
    countActiveRidesByDriver(driverId: string): Promise<number>;
}
