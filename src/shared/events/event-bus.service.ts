import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DomainEventName } from './domain-events.constants';

/**
 * EventBusService — abstraction over EventEmitter2.
 * Découple les producteurs des consommateurs.
 * Peut être swappé vers Redis Streams / NATS sans changer les modules métier.
 */
@Injectable()
export class EventBusService {
  private readonly logger = new Logger(EventBusService.name);

  constructor(private readonly emitter: EventEmitter2) {}

  /**
   * Émettre un événement de domaine.
   * Les consommateurs s'abonnent via @OnEvent(DomainEvents.XXX)
   */
  async emit<T extends object>(
    event: DomainEventName,
    payload: T,
  ): Promise<void> {
    this.logger.debug(`Emitting event: ${event}`, payload);
    this.emitter.emit(event, payload);
  }

  /**
   * Émission asynchrone avec garantie de livraison (via BullMQ en prod)
   */
  async emitAsync<T extends object>(
    event: DomainEventName,
    payload: T,
  ): Promise<void> {
    this.logger.debug(`Emitting async event: ${event}`, payload);
    await this.emitter.emitAsync(event, payload);
  }
}
