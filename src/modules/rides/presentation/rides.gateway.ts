import {
  WebSocketGateway, WebSocketServer, SubscribeMessage,
  MessageBody, ConnectedSocket, OnGatewayConnection, OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { DomainEvents } from '../../../shared/events/domain-events.constants';

/**
 * RidesGateway — Suivi GPS temps réel.
 * Le client mobile émet 'driver:location' toutes les 3 secondes.
 * Les passagers s'abonnent à la room 'ride:{rideId}'.
 */
@WebSocketGateway({ namespace: '/rides', cors: { origin: '*' } })
export class RidesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RidesGateway.name);

  constructor(private readonly eventBus: EventBusService) {}

  handleConnection(client: Socket): void {
    this.logger.debug(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket): void {
    this.logger.debug(`Client disconnected: ${client.id}`);
  }

  /** Chauffeur met à jour sa position */
  @SubscribeMessage('driver:location')
  async handleDriverLocation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { rideId: string; driverId: string; lat: number; lng: number },
  ): Promise<void> {
    // Broadcaster à tous les clients dans la room de cette course
    this.server.to(`ride:${data.rideId}`).emit('driver:location:update', {
      lat: data.lat,
      lng: data.lng,
      timestamp: new Date().toISOString(),
    });

    // Émettre event pour mettre à jour la position du driver en DB
    await this.eventBus.emit(DomainEvents.DRIVER_LOCATION_UPDATED, {
      version: 1,
      driverId: data.driverId,
      rideId: data.rideId,
      lat: data.lat,
      lng: data.lng,
      timestamp: new Date(),
    });
  }

  /** Passager rejoint la room de sa course pour écouter les updates */
  @SubscribeMessage('ride:join')
  handleJoinRide(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { rideId: string },
  ): void {
    void client.join(`ride:${data.rideId}`);
    this.logger.debug(`Client ${client.id} joined room ride:${data.rideId}`);
  }

  /** Broadcaster un changement de statut à tous les abonnés */
  broadcastStatusChange(rideId: string, status: string): void {
    this.server.to(`ride:${rideId}`).emit('ride:status:changed', { rideId, status });
  }
}
