import { EventEmitter2 } from '@nestjs/event-emitter';
import { DomainEventName } from './domain-events.constants';
export declare class EventBusService {
    private readonly emitter;
    private readonly logger;
    constructor(emitter: EventEmitter2);
    emit<T extends object>(event: DomainEventName, payload: T): Promise<void>;
    emitAsync<T extends object>(event: DomainEventName, payload: T): Promise<void>;
}
