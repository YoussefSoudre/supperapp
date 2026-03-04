import { PaginatedResult, FindAllOptions } from '../../../../shared/interfaces/repository.interface';
import { Ride } from '../entities/ride.entity';
export interface IRideRepository {
    findById(id: string): Promise<Ride | null>;
    findByUserId(userId: string, options?: FindAllOptions): Promise<PaginatedResult<Ride>>;
    findByDriverId(driverId: string, options?: FindAllOptions): Promise<PaginatedResult<Ride>>;
    findPendingScheduled(before: Date): Promise<Ride[]>;
    save(ride: Omit<Ride, 'id' | 'createdAt' | 'updatedAt'>): Promise<Ride>;
    update(id: string, data: Partial<Ride>): Promise<Ride>;
    countActiveRidesByDriver(driverId: string): Promise<number>;
}
export declare const RIDE_REPOSITORY: unique symbol;
