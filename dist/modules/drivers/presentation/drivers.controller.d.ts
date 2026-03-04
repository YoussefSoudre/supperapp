import { DriversService } from '../application/drivers.service';
export declare class DriversController {
    private readonly driversService;
    constructor(driversService: DriversService);
    getProfile(req: {
        user: {
            id: string;
        };
    }): Promise<import("../domain/entities/driver.entity").Driver>;
    goOnline(req: {
        user: {
            id: string;
        };
    }): Promise<void>;
    goOffline(req: {
        user: {
            id: string;
        };
    }): Promise<void>;
}
