import { Repository } from 'typeorm';
import { Driver } from '../domain/entities/driver.entity';
import { EventBusService } from '../../../shared/events/event-bus.service';
export declare class DriversService {
    private readonly repo;
    private readonly eventBus;
    constructor(repo: Repository<Driver>, eventBus: EventBusService);
    findByUserId(userId: string): Promise<Driver>;
    findAvailableNear(lat: number, lng: number, radiusKm: number, cityId: string): Promise<Driver[]>;
    setOnline(userId: string): Promise<void>;
    setOffline(userId: string): Promise<void>;
    handleLocationUpdate(payload: {
        driverId: string;
        lat: number;
        lng: number;
    }): Promise<void>;
}
