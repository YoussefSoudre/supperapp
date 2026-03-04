import {
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';

interface JwtUserPayload {
  sub:    string;
  role:   string;
  cityId: string | null;
}

/**
 * NotificationGateway
 * ───────────────────
 * Gateway Socket.IO pour les notifications temps réel.
 * Namespace : /notifications  (ex: ws://host:3000/notifications)
 *
 * Rooms utilisées :
 *  - user:{userId}   → notification individuelle
 *  - city:{cityId}   → broadcast par ville
 *  - role:{role}     → broadcast par rôle (driver, user, admin)
 *
 * Auth : Bearer JWT dans handshake.auth.token ou query.token.
 */
@WebSocketGateway({
  namespace: '/notifications',
  cors: { origin: '*', credentials: true },
  transports: ['websocket', 'polling'],
})
export class NotificationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  private readonly server: Server;

  private readonly logger = new Logger(NotificationGateway.name);

  /** userId → Set<socketId> — pour compter les connexions actives */
  private readonly userSockets = new Map<string, Set<string>>();

  constructor(private readonly jwtService: JwtService) {}

  // ─── Lifecycle ──────────────────────────────────────────────────────────────

  async handleConnection(client: Socket): Promise<void> {
    try {
      const payload = this.authenticate(client);

      // Stocker userId sur le socket pour accès dans handleDisconnect
      (client as unknown as { userId: string }).userId = payload.sub;

      // Rejoindre les rooms
      await client.join(`user:${payload.sub}`);
      await client.join(`role:${payload.role}`);
      if (payload.cityId) {
        await client.join(`city:${payload.cityId}`);
      }

      // Comptage des sockets par user
      if (!this.userSockets.has(payload.sub)) {
        this.userSockets.set(payload.sub, new Set());
      }
      this.userSockets.get(payload.sub)!.add(client.id);

      this.logger.debug(
        `Client connected: socketId=${client.id} userId=${payload.sub} role=${payload.role}`,
      );
    } catch {
      this.logger.warn(`Unauthorized socket connection attempt: ${client.id}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket): void {
    const userId = (client as unknown as { userId?: string }).userId;
    if (userId) {
      this.userSockets.get(userId)?.delete(client.id);
      if (this.userSockets.get(userId)?.size === 0) {
        this.userSockets.delete(userId);
      }
    }
    this.logger.debug(`Client disconnected: ${client.id}`);
  }

  // ─── Public emit API (called by processors / BroadcastService) ──────────────

  /**
   * Envoie à un utilisateur précis (toutes ses connexions actives).
   * @returns true si au moins un socket était connecté.
   */
  sendToUser(userId: string, payload: Record<string, unknown>): boolean {
    const room = `user:${userId}`;
    const sockets = this.userSockets.get(userId);
    const isConnected = !!sockets && sockets.size > 0;
    this.server?.to(room).emit('notification', payload);
    return isConnected;
  }

  /**
   * Envoie à tous les utilisateurs d'une ville.
   */
  sendToCity(cityId: string, payload: Record<string, unknown>): void {
    this.server?.to(`city:${cityId}`).emit('notification', payload);
    this.logger.debug(`Broadcast to city:${cityId}`);
  }

  /**
   * Envoie à tous les utilisateurs d'un rôle.
   */
  sendToRole(role: string, payload: Record<string, unknown>): void {
    this.server?.to(`role:${role}`).emit('notification', payload);
    this.logger.debug(`Broadcast to role:${role}`);
  }

  /**
   * Envoie à tous les clients connectés (toutes villes, tous rôles).
   */
  broadcast(payload: Record<string, unknown>): void {
    this.server?.emit('notification', payload);
  }

  // ─── Client-initiated messages ───────────────────────────────────────────────

  /** Le client confirme qu'il a reçu (et éventuellement lu) une notification. */
  @SubscribeMessage('ack')
  handleAck(
    @MessageBody() data: { notificationId: string },
    @ConnectedSocket() client: Socket,
  ): void {
    const userId = (client as unknown as { userId?: string }).userId;
    this.logger.debug(`ACK: notifId=${data.notificationId} userId=${userId}`);
    // Optionnel: émettre un event interne pour marquer comme read en DB
  }

  /** Ping basique pour garder la connexion en vie. */
  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket): void {
    client.emit('pong', { ts: Date.now() });
  }

  // ─── Stats ────────────────────────────────────────────────────────────────────

  /** Nombre d'utilisateurs uniques actuellement connectés. */
  getConnectedUsersCount(): number {
    return this.userSockets.size;
  }

  /** Nombre total de sockets actifs. */
  getTotalSocketsCount(): number {
    let total = 0;
    for (const sockets of this.userSockets.values()) {
      total += sockets.size;
    }
    return total;
  }

  // ─── Private ─────────────────────────────────────────────────────────────────

  private authenticate(client: Socket): JwtUserPayload {
    const token: string | undefined =
      (client.handshake.auth as { token?: string })?.token ??
      (client.handshake.query as { token?: string })?.token;

    if (!token) throw new UnauthorizedException('Missing token');

    try {
      return this.jwtService.verify<JwtUserPayload>(token);
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
