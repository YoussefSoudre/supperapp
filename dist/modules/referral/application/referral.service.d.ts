import { Repository } from 'typeorm';
import { ReferralProgram } from '../domain/entities/referral-program.entity';
import { ReferralUsage } from '../domain/entities/referral-usage.entity';
import { UserRegisteredPayload, RideCompletedPayload } from '../../../shared/events/domain-events.constants';
import { EventBusService } from '../../../shared/events/event-bus.service';
export declare class ReferralService {
    private readonly programRepo;
    private readonly usageRepo;
    private readonly eventBus;
    private readonly logger;
    constructor(programRepo: Repository<ReferralProgram>, usageRepo: Repository<ReferralUsage>, eventBus: EventBusService);
    onUserRegistered(payload: UserRegisteredPayload): Promise<void>;
    onRideCompleted(payload: RideCompletedPayload): Promise<void>;
}
