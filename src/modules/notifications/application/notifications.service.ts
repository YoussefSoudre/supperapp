import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { OnEvent } from '@nestjs/event-emitter';
import {
  Notification,
  NotificationChannel,
  NotificationStatus,
  NotificationCategory,
  NotificationPriority,
} from '../domain/entities/notification.entity';
import { NotificationDeliveryLog } from '../domain/entities/notification-delivery-log.entity';
import {
  DomainEvents,
  RideCompletedPayload,
  UserRegisteredPayload,
  PaymentSuccessPayload,
  RideModifiedPayload,
  ReferralRewardGrantedPayload,
} from '../../../shared/events/domain-events.constants';
import { NotificationQueueService } from './notification-queue.service';
import { SendNotificationInput } from '../domain/interfaces/notification-job.interface';
import { PaginatedResult } from '../../../shared/interfaces/repository.interface';

/** Filtres pour la liste des notifications */
export interface NotificationFilterParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  dateFrom?: string;
  dateTo?: string;
  category?: NotificationCategory;
  channel?: NotificationChannel;
  priority?: NotificationPriority;
  isRead?: boolean;
}

/**
 * NotificationsService
 * ─────────────────────
 * Orchestrateur principal des notifications.
 * Consomme les Domain Events et les route vers la queue BullMQ appropriée.
 *
 * Pattern Observer strict :
 *  - Aucun module ne dépend de ce service
 *  - Ajout d'une nouvelle notification = @OnEvent handler ici + SendNotificationInput
 *  - Zéro appel direct à FCM/Twilio (tout passe par NotificationQueueService → Processor → Adapter)
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly repo: Repository<Notification>,

    @InjectRepository(NotificationDeliveryLog)
    private readonly deliveryLogRepo: Repository<NotificationDeliveryLog>,

    private readonly queue: NotificationQueueService,
  ) {}

  /**
   * API publique : envoie une notification via la queue.
   * Utilisé par les event handlers ET par les autres modules si nécessaire.
   */
  async notify(input: SendNotificationInput): Promise<void> {
    try {
      await this.queue.enqueue(input);
    } catch (err) {
      this.logger.error(`Failed to enqueue notification for user ${input.userId}: ${err}`);
    }
  }

  // ─── Helper privé pour envoyer sans throw ───────────────────────────────────

  private async send(input: SendNotificationInput): Promise<void> {
    return this.notify(input);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Domain Event Handlers
  // ─────────────────────────────────────────────────────────────────────────────

  // ─── Ride Events ─────────────────────────────────────────────────────────────

  @OnEvent(DomainEvents.RIDE_ACCEPTED)
  async onRideAccepted(payload: {
    userId: string;
    driverId: string;
    rideId: string;
    estimatedArrivalSec?: number;
  }): Promise<void> {
    const etaMin = payload.estimatedArrivalSec
      ? `ETA: ${Math.ceil(payload.estimatedArrivalSec / 60)} min.`
      : '';
    await this.send({
      userId:    payload.userId,
      channel:   NotificationChannel.PUSH,
      category:  NotificationCategory.RIDE,
      priority:  NotificationPriority.HIGH,
      title:     '🚗 Chauffeur trouvé !',
      body:      `Votre chauffeur est en route. ${etaMin}`.trim(),
      data:      { rideId: payload.rideId, screen: 'RideTracking' },
    });
    // In-App également
    await this.send({
      userId:   payload.userId,
      channel:  NotificationChannel.IN_APP,
      category: NotificationCategory.RIDE,
      priority: NotificationPriority.HIGH,
      title:    '🚗 Chauffeur trouvé !',
      body:     `Votre chauffeur est en route. ${etaMin}`.trim(),
      data:     { rideId: payload.rideId, screen: 'RideTracking' },
    });
  }

  @OnEvent(DomainEvents.RIDE_STARTED)
  async onRideStarted(payload: { userId: string; rideId: string }): Promise<void> {
    await this.send({
      userId:   payload.userId,
      channel:  NotificationChannel.PUSH,
      category: NotificationCategory.RIDE,
      priority: NotificationPriority.NORMAL,
      title:    '▶️ Course démarrée',
      body:     'Votre course est en cours. Bon voyage !',
      data:     { rideId: payload.rideId, screen: 'RideTracking' },
    });
  }

  @OnEvent(DomainEvents.RIDE_COMPLETED)
  async onRideCompleted(payload: RideCompletedPayload): Promise<void> {
    await this.send({
      userId:   payload.userId,
      channel:  NotificationChannel.PUSH,
      category: NotificationCategory.RIDE,
      priority: NotificationPriority.NORMAL,
      title:    '✅ Course terminée',
      body:     `Course terminée. Montant: ${payload.amount} ${payload.currency}`,
      data:     { rideId: payload.rideId, amount: payload.amount, screen: 'RideReceipt' },
    });
    await this.send({
      userId:   payload.userId,
      channel:  NotificationChannel.IN_APP,
      category: NotificationCategory.RIDE,
      priority: NotificationPriority.NORMAL,
      title:    '✅ Course terminée',
      body:     `Montant: ${payload.amount} ${payload.currency}`,
      data:     { rideId: payload.rideId, screen: 'RideReceipt' },
    });
  }

  @OnEvent(DomainEvents.RIDE_CANCELLED)
  async onRideCancelled(payload: {
    userId:   string;
    rideId:   string;
    reason?:  string;
    feeXof?:  number;
  }): Promise<void> {
    const feeMsg = payload.feeXof ? ` Frais d'annulation: ${payload.feeXof} XOF.` : '';
    await this.send({
      userId:   payload.userId,
      channel:  NotificationChannel.PUSH,
      category: NotificationCategory.RIDE,
      priority: NotificationPriority.NORMAL,
      title:    '❌ Course annulée',
      body:     `Votre course a été annulée.${feeMsg}`,
      data:     { rideId: payload.rideId, screen: 'Home' },
    });
  }

  @OnEvent(DomainEvents.RIDE_MODIFIED)
  async onRideModified(payload: RideModifiedPayload): Promise<void> {
    const baseBody = payload.modificationFeeXof > 0
      ? `Modification appliquée. Frais: ${payload.modificationFeeXof} XOF.`
      : `Votre course a été modifiée (${payload.field}).`;

    await this.send({
      userId:   payload.userId,
      channel:  NotificationChannel.PUSH,
      category: NotificationCategory.RIDE,
      priority: NotificationPriority.HIGH,
      title:    '✏️ Course modifiée',
      body:     baseBody,
      data:     { rideId: payload.rideId, screen: 'RideTracking' },
    });

    if (payload.driverId) {
      await this.send({
        userId:   payload.driverId,
        channel:  NotificationChannel.PUSH,
        category: NotificationCategory.RIDE,
        priority: NotificationPriority.HIGH,
        title:    '🔄 Modification de course',
        body:     'La destination de votre course a été mise à jour.',
        data:     { rideId: payload.rideId, screen: 'ActiveRide' },
      });
    }
  }

  @OnEvent(DomainEvents.RIDE_SCHEDULED)
  async onRideScheduled(payload: {
    userId:      string;
    rideId:      string;
    scheduledAt: Date;
  }): Promise<void> {
    const dateStr = new Date(payload.scheduledAt).toLocaleString('fr-BF');
    await this.send({
      userId:   payload.userId,
      channel:  NotificationChannel.PUSH,
      category: NotificationCategory.RIDE,
      priority: NotificationPriority.NORMAL,
      title:    '📅 Course programmée',
      body:     `Votre course est programmée pour le ${dateStr}`,
      data:     { rideId: payload.rideId, screen: 'ScheduledRides' },
    });
  }

  // ─── Delivery Events ──────────────────────────────────────────────────────────

  @OnEvent(DomainEvents.DELIVERY_PICKED_UP)
  async onDeliveryPickedUp(payload: { userId: string; deliveryId: string }): Promise<void> {
    await this.send({
      userId:   payload.userId,
      channel:  NotificationChannel.PUSH,
      category: NotificationCategory.DELIVERY,
      priority: NotificationPriority.NORMAL,
      title:    '📦 Colis récupéré',
      body:     'Votre colis est en route vers la destination.',
      data:     { deliveryId: payload.deliveryId, screen: 'DeliveryTracking' },
    });
  }

  @OnEvent(DomainEvents.DELIVERY_COMPLETED)
  async onDeliveryCompleted(payload: { userId: string; deliveryId: string }): Promise<void> {
    await this.send({
      userId:   payload.userId,
      channel:  NotificationChannel.PUSH,
      category: NotificationCategory.DELIVERY,
      priority: NotificationPriority.NORMAL,
      title:    '✅ Livraison effectuée',
      body:     'Votre colis a été livré avec succès.',
      data:     { deliveryId: payload.deliveryId, screen: 'DeliveryReceipt' },
    });
  }

  // ─── Food Events ──────────────────────────────────────────────────────────────

  @OnEvent(DomainEvents.FOOD_ORDER_CONFIRMED)
  async onFoodOrderConfirmed(payload: { userId: string; orderId: string }): Promise<void> {
    await this.send({
      userId:   payload.userId,
      channel:  NotificationChannel.PUSH,
      category: NotificationCategory.FOOD,
      priority: NotificationPriority.NORMAL,
      title:    '🍽️ Commande confirmée',
      body:     'Votre commande est en cours de préparation.',
      data:     { orderId: payload.orderId, screen: 'OrderTracking' },
    });
  }

  @OnEvent(DomainEvents.FOOD_ORDER_READY)
  async onFoodOrderReady(payload: { userId: string; orderId: string }): Promise<void> {
    await this.send({
      userId:   payload.userId,
      channel:  NotificationChannel.PUSH,
      category: NotificationCategory.FOOD,
      priority: NotificationPriority.HIGH,
      title:    '🍔 Commande prête !',
      body:     'Votre commande est prête et sera bientôt livrée.',
      data:     { orderId: payload.orderId, screen: 'OrderTracking' },
    });
  }

  @OnEvent(DomainEvents.FOOD_ORDER_DELIVERED)
  async onFoodOrderDelivered(payload: { userId: string; orderId: string }): Promise<void> {
    await this.send({
      userId:   payload.userId,
      channel:  NotificationChannel.PUSH,
      category: NotificationCategory.FOOD,
      priority: NotificationPriority.NORMAL,
      title:    '✅ Commande livrée',
      body:     'Votre commande a été livrée. Bon appétit !',
      data:     { orderId: payload.orderId, screen: 'OrderReceipt' },
    });
  }

  // ─── Payment Events ───────────────────────────────────────────────────────────

  @OnEvent(DomainEvents.PAYMENT_SUCCESS)
  async onPaymentSuccess(payload: PaymentSuccessPayload): Promise<void> {
    await this.send({
      userId:   payload.userId,
      channel:  NotificationChannel.PUSH,
      category: NotificationCategory.PAYMENT,
      priority: NotificationPriority.NORMAL,
      title:    '💳 Paiement confirmé',
      body:     `Paiement de ${payload.amount} ${payload.currency} confirmé.`,
      data:     { paymentId: payload.paymentId, screen: 'PaymentHistory' },
    });
  }

  @OnEvent(DomainEvents.PAYMENT_FAILED)
  async onPaymentFailed(payload: {
    userId:    string;
    amount:    number;
    currency:  string;
    reason?:   string;
  }): Promise<void> {
    await this.send({
      userId:   payload.userId,
      channel:  NotificationChannel.PUSH,
      category: NotificationCategory.PAYMENT,
      priority: NotificationPriority.HIGH,
      title:    '⚠️ Échec du paiement',
      body:     `Paiement de ${payload.amount} ${payload.currency} échoué. Vérifiez votre solde.`,
      data:     { reason: payload.reason, screen: 'PaymentMethods' },
    });
  }

  // ─── Wallet Events ────────────────────────────────────────────────────────────

  @OnEvent(DomainEvents.WALLET_CREDITED)
  async onWalletCredited(payload: {
    userId:     string;
    amount:     number;
    newBalance: number;
  }): Promise<void> {
    await this.send({
      userId:   payload.userId,
      channel:  NotificationChannel.IN_APP,
      category: NotificationCategory.PAYMENT,
      priority: NotificationPriority.NORMAL,
      title:    '💰 Wallet crédité',
      body:     `+${payload.amount / 100} XOF. Solde: ${payload.newBalance / 100} XOF`,
      data:     { amount: payload.amount, screen: 'Wallet' },
    });
    // WebSocket pour mise à jour temps réel du badge
    await this.send({
      userId:   payload.userId,
      channel:  NotificationChannel.WEBSOCKET,
      category: NotificationCategory.PAYMENT,
      priority: NotificationPriority.NORMAL,
      title:    'Wallet mis à jour',
      body:     `Nouveau solde: ${payload.newBalance / 100} XOF`,
      data:     { newBalance: payload.newBalance, action: 'refresh_wallet' },
    });
  }

  // ─── User Events ──────────────────────────────────────────────────────────────

  @OnEvent(DomainEvents.USER_REGISTERED)
  async onUserRegistered(payload: UserRegisteredPayload): Promise<void> {
    await this.send({
      userId:        payload.userId,
      channel:       NotificationChannel.SMS,
      category:      NotificationCategory.SYSTEM,
      priority:      NotificationPriority.HIGH,
      title:         'Bienvenue sur SuperApp BF 🇧🇫',
      body:          `Bienvenue ! Votre code parrainage : ${payload.referralCode ?? 'N/A'}`,
      recipientPhone: payload.phone,
    });
    await this.send({
      userId:   payload.userId,
      channel:  NotificationChannel.IN_APP,
      category: NotificationCategory.SYSTEM,
      priority: NotificationPriority.NORMAL,
      title:    '👋 Bienvenue !',
      body:     'Bienvenue sur SuperApp BF. Tous vos services au bout des doigts.',
      data:     { screen: 'Onboarding' },
    });
  }

  // ─── Referral Events ──────────────────────────────────────────────────────────

  @OnEvent(DomainEvents.REFERRAL_REWARD_GRANTED)
  async onReferralRewardGranted(payload: ReferralRewardGrantedPayload): Promise<void> {
    await this.send({
      userId:   payload.referrerId,
      channel:  NotificationChannel.PUSH,
      category: NotificationCategory.REFERRAL,
      priority: NotificationPriority.NORMAL,
      title:    '🎁 Bonus parrainage reçu !',
      body:     `Vous avez gagné ${payload.referrerAmountXof} XOF grâce à votre filleul.`,
      data:     { amountXof: payload.referrerAmountXof, screen: 'Referral' },
    });
    await this.send({
      userId:   payload.refereeId,
      channel:  NotificationChannel.PUSH,
      category: NotificationCategory.REFERRAL,
      priority: NotificationPriority.NORMAL,
      title:    '🎉 Réduction parrainage !',
      body:     `Vous bénéficiez d'une réduction de ${payload.refereeAmountXof} XOF.`,
      data:     { amountXof: payload.refereeAmountXof, screen: 'Wallet' },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Query API
  // ─────────────────────────────────────────────────────────────────────────────

  /** Notifications non lues/non livrées d'un user (pour le badge de l'app). */
  async getUnread(userId: string): Promise<Notification[]> {
    return this.repo.find({
      where: {
        userId,
        status: In([
          NotificationStatus.DELIVERED,
          NotificationStatus.SENT,
        ]),
      },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  /**
   * Liste paginée et filtrée des notifications d'un utilisateur.
   * Remplace avantageusement getUnread() pour les vues liste.
   */
  async findAll(
    userId: string,
    params: NotificationFilterParams = {},
  ): Promise<PaginatedResult<Notification>> {
    const {
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      dateFrom,
      dateTo,
      category,
      channel,
      priority,
      isRead,
    } = params;

    const ALLOWED_SORT = ['createdAt', 'updatedAt', 'readAt'];
    const safeSort = ALLOWED_SORT.includes(sortBy) ? sortBy : 'createdAt';

    const qb = this.repo
      .createQueryBuilder('n')
      .where('n.userId = :userId', { userId });

    // ─── Filtres standards ─────────────────────────────────────────────────
    if (dateFrom) qb.andWhere('n.createdAt >= :dateFrom', { dateFrom });
    if (dateTo)   qb.andWhere('n.createdAt <= :dateTo',   { dateTo });

    // ─── Filtres avancés ──────────────────────────────────────────────────
    if (category) qb.andWhere('n.category = :category', { category });
    if (channel)  qb.andWhere('n.channel = :channel',   { channel });
    if (priority) qb.andWhere('n.priority = :priority', { priority });

    if (isRead === true) {
      qb.andWhere('n.status = :readStatus', { readStatus: NotificationStatus.READ });
    } else if (isRead === false) {
      qb.andWhere('n.status IN (:...unreadStatuses)', {
        unreadStatuses: [NotificationStatus.DELIVERED, NotificationStatus.SENT],
      });
    }

    const skip = (page - 1) * limit;
    const [data, total] = await qb
      .orderBy(`n.${safeSort}`, sortOrder)
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /** Marque une notification comme lue. */
  async markAsRead(id: string, userId: string): Promise<void> {
    await this.repo.update(
      { id, userId },
      { status: NotificationStatus.READ, readAt: new Date() },
    );
  }

  /** Marque toutes les notifications non lues d'un user comme lues. */
  async markAllAsRead(userId: string): Promise<void> {
    await this.repo
      .createQueryBuilder()
      .update()
      .set({ status: NotificationStatus.READ, readAt: new Date() })
      .where('userId = :userId', { userId })
      .andWhere('status IN (:...statuses)', {
        statuses: [NotificationStatus.DELIVERED, NotificationStatus.SENT],
      })
      .execute();
  }

  /** Notifications programmées en attente. */
  async getScheduled(userId?: string): Promise<Notification[]> {
    const qb = this.repo
      .createQueryBuilder('n')
      .where('n.status = :status', { status: NotificationStatus.SCHEDULED })
      .orderBy('n.scheduledAt', 'ASC');
    if (userId) qb.andWhere('n.userId = :userId', { userId });
    return qb.getMany();
  }

  /** Annule une notification programmée. */
  async cancelScheduled(id: string): Promise<boolean> {
    return this.queue.cancel(id);
  }

  /** Logs de livraison d'une notification (pour diagnostic). */
  async getDeliveryLogs(notificationId: string): Promise<NotificationDeliveryLog[]> {
    return this.deliveryLogRepo.find({
      where: { notificationId },
      order: { attempt: 'ASC', createdAt: 'ASC' },
    });
  }

  /** Statistiques globales de livraison (pour dashboard admin). */
  async getStats(since: Date): Promise<{
    total:     number;
    delivered: number;
    failed:    number;
    pending:   number;
    byChannel: Record<string, number>;
  }> {
    const result = await this.repo
      .createQueryBuilder('n')
      .select('n.status', 'status')
      .addSelect('n.channel', 'channel')
      .addSelect('COUNT(*)', 'count')
      .where('n.createdAt >= :since', { since })
      .groupBy('n.status, n.channel')
      .getRawMany<{ status: string; channel: string; count: string }>();

    const stats = {
      total:     0,
      delivered: 0,
      failed:    0,
      pending:   0,
      byChannel: {} as Record<string, number>,
    };

    for (const row of result) {
      const count = parseInt(row.count, 10);
      stats.total += count;
      if (row.status === NotificationStatus.DELIVERED) stats.delivered += count;
      if (row.status === NotificationStatus.FAILED)    stats.failed    += count;
      if ([NotificationStatus.PENDING, NotificationStatus.QUEUED].includes(row.status as NotificationStatus)) {
        stats.pending += count;
      }
      stats.byChannel[row.channel] = (stats.byChannel[row.channel] ?? 0) + count;
    }

    return stats;
  }
}

