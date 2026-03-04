import { PaginatedResult, FindAllOptions } from '../../../../shared/interfaces/repository.interface';
import { Ride, RideStatus } from '../entities/ride.entity';
import { RideModificationLog } from '../entities/ride-modification-log.entity';

/**
 * Port — Interface du Repository Rides.
 * Le Domain ne connaît PAS TypeORM. L'Infrastructure implémente ce contrat.
 */
export interface IRideRepository {
  findById(id: string): Promise<Ride | null>;
  findByUserId(userId: string, options?: FindAllOptions): Promise<PaginatedResult<Ride>>;
  findByDriverId(driverId: string, options?: FindAllOptions): Promise<PaginatedResult<Ride>>;
  findPendingScheduled(before: Date): Promise<Ride[]>;
  save(ride: Omit<Ride, 'id' | 'createdAt' | 'updatedAt'>): Promise<Ride>;
  update(id: string, data: Partial<Ride>): Promise<Ride>;
  countActiveRidesByDriver(driverId: string): Promise<number>;
  /** Enregistrer une entrée d'audit de modification (immuable) */
  saveModificationLog(
    log: Omit<RideModificationLog, 'id' | 'createdAt'>,
  ): Promise<RideModificationLog>;
  /** Historique des modifications d'une course */
  findModificationLogs(rideId: string): Promise<RideModificationLog[]>;
}

export const RIDE_REPOSITORY = Symbol('IRideRepository');
