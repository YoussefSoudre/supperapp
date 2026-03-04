import { EventBusService } from '../../../shared/events/event-bus.service';
export declare class SchedulingService {
    private readonly eventBus;
    private readonly logger;
    constructor(eventBus: EventBusService);
    processPendingScheduledRides(): Promise<void>;
    cleanup(): Promise<void>;
    dailyConsolidation(): Promise<void>;
}
