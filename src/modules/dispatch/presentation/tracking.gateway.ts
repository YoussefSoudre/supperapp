import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Server, Socket } from 'socket.io';
import { RedisService } from '../../../infrastructure/redis/redis.service';
import { DomainEvents } from '../../../shared/events/domain-events.constants';

interface DriverLocationPayload {
  driverId: string;
  lat:      number;
  lng:      number;
  heading?: number;   // cap en degrés (0–360)
  speedKmh?: number;
}

interface TrackRidePayload {
  rideId:   string;
  userId:   string;
}

/**
 * TrackingGateway — Suivi en temps réel de la position du chauffeur par le passager.
 *
 * Connexion WebSocket  : ws://host:3001/tracking
 *
 * Flux :
 *  1. Client passager  → event 'track:ride'       { rideId }
 *  2. Chauffeur         → event 'driver:location'  { driverId, lat, lng, heading, speedKmh }
 *     ↳ Stocké dans Redis  geo:drivers:{cityId}  + driver:meta:{driverId}
 *     ↳ Broadcast vers la room 'ride:{rideId}'
 *  3. Client passager  reçoit 'driver:position' en temps réel
 *
 * Rooms Socket.IO :
 *  - ride:{rideId}  → tous les passagers qui suivent cette course
 *  - driver:{driverId} → connexion du chauffeur (1 socket par chauffeur)
 */
@WebSocketGateway({
  namespace: '/tracking',
  cors: { origin: '*' },
})
export class TrackingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(TrackingGateway.name);

  /** Map socketId → driverId (pour cleanup sur déconnexion) */
  private readonly driverSockets = new Map<string, string>();

  /** Map socketId → rideId (pour cleanup passager) */
  private readonly passengerSockets = new Map<string, string>();

  constructor(private readonly redis: RedisService) {}

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  handleConnection(client: Socket): void {
    this.logger.debug(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket): void {
    // Nettoyage tracking passager
    const rideId = this.passengerSockets.get(client.id);
    if (rideId) {
      void client.leave(`ride:${rideId}`);
      this.passengerSockets.delete(client.id);
    }
    // Nettoyage driver socket
    const driverId = this.driverSockets.get(client.id);
    if (driverId) {
      this.driverSockets.delete(client.id);
      this.logger.debug(`Driver ${driverId} disconnected from tracking`);
    }
    this.logger.debug(`Client disconnected: ${client.id}`);
  }

  // ─── Passager — S'abonner au suivi d'une course ──────────────────────────

  @SubscribeMessage('track:ride')
  async handleTrackRide(
    @MessageBody()    payload: TrackRidePayload,
    @ConnectedSocket() client: Socket,
  ): Promise<{ ok: boolean; lastPosition?: DriverLocationPayload }> {
    const { rideId } = payload;
    const room = `ride:${rideId}`;

    // Rejoindre la room de la course
    await client.join(room);
    this.passengerSockets.set(client.id, rideId);
    this.logger.log(`Passenger ${client.id} tracking ride ${rideId}`);

    // Envoyer la dernière position connue du chauffeur (depuis Redis)
    const cached = await this.redis.getJson<DriverLocationPayload>(`driver:location:${rideId}`);

    return { ok: true, lastPosition: cached ?? undefined };
  }

  @SubscribeMessage('untrack:ride')
  async handleUntrackRide(
    @MessageBody()    payload: { rideId: string },
    @ConnectedSocket() client: Socket,
  ): Promise<{ ok: boolean }> {
    await client.leave(`ride:${payload.rideId}`);
    this.passengerSockets.delete(client.id);
    return { ok: true };
  }

  // ─── Chauffeur — Envoyer sa position ─────────────────────────────────────

  @SubscribeMessage('driver:location')
  async handleDriverLocation(
    @MessageBody()    payload: DriverLocationPayload & { rideId: string; cityId: string },
    @ConnectedSocket() client: Socket,
  ): Promise<{ ok: boolean }> {
    const { driverId, lat, lng, heading, speedKmh, rideId, cityId } = payload;

    // Enregistrer la socket du chauffeur
    this.driverSockets.set(client.id, driverId);

    // ── Mise à jour Redis GEO (pour le dispatch) ─────────────────────────
    const geoKey = `geo:drivers:${cityId}`;
    await this.redis.client.geoadd(geoKey, lng, lat, driverId);

    // ── Mise à jour metadata du chauffeur ────────────────────────────────
    await this.redis.client.hset(`driver:meta:${driverId}`, {
      lat:        String(lat),
      lng:        String(lng),
      heading:    String(heading  ?? 0),
      speedKmh:   String(speedKmh ?? 0),
      updatedAt:  new Date().toISOString(),
    });

    // ── Cache dernière position par course ───────────────────────────────
    await this.redis.setJson(`driver:location:${rideId}`, { driverId, lat, lng, heading, speedKmh }, 60);

    // ── Broadcast vers tous les passagers de cette course ────────────────
    this.server.to(`ride:${rideId}`).emit('driver:position', {
      driverId,
      lat,
      lng,
      heading:  heading  ?? 0,
      speedKmh: speedKmh ?? 0,
      timestamp: new Date().toISOString(),
    });

    return { ok: true };
  }

  // ─── Écoute DomainEvent DRIVER_LOCATION_UPDATED (si update via HTTP) ─────

  @OnEvent(DomainEvents.DRIVER_LOCATION_UPDATED)
  async onDriverLocationUpdated(payload: {
    driverId: string;
    lat:      number;
    lng:      number;
    rideId?:  string;
  }): Promise<void> {
    if (!payload.rideId) return;
    this.server.to(`ride:${payload.rideId}`).emit('driver:position', {
      driverId:  payload.driverId,
      lat:       payload.lat,
      lng:       payload.lng,
      timestamp: new Date().toISOString(),
    });
  }

  // ─── Utilitaires admin ────────────────────────────────────────────────────

  /** Notifie le passager que le chauffeur est arrivé au point de prise en charge */
  emitDriverArrived(rideId: string, driverId: string): void {
    this.server.to(`ride:${rideId}`).emit('driver:arrived', { driverId, timestamp: new Date().toISOString() });
  }

  /** Notifie le passager que la course a été annulée */
  emitRideCancelled(rideId: string, reason?: string): void {
    this.server.to(`ride:${rideId}`).emit('ride:cancelled', { rideId, reason, timestamp: new Date().toISOString() });
  }
}
