"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var NotificationsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const event_emitter_1 = require("@nestjs/event-emitter");
const notification_entity_1 = require("../domain/entities/notification.entity");
const domain_events_constants_1 = require("../../../shared/events/domain-events.constants");
let NotificationsService = NotificationsService_1 = class NotificationsService {
    repo;
    logger = new common_1.Logger(NotificationsService_1.name);
    constructor(repo) {
        this.repo = repo;
    }
    async send(notification) {
        const saved = await this.repo.save(this.repo.create(notification));
        this.logger.log(`Notification sent [${notification.channel}] to user ${notification.userId}: ${notification.title}`);
    }
    async onRideAccepted(payload) {
        await this.send({
            userId: payload.userId,
            channel: notification_entity_1.NotificationChannel.PUSH,
            category: notification_entity_1.NotificationCategory.RIDE,
            status: notification_entity_1.NotificationStatus.PENDING,
            title: '🚗 Chauffeur trouvé !',
            body: 'Votre chauffeur est en route. Suivez-le en temps réel.',
            data: { rideId: payload.rideId, screen: 'RideTracking' },
            providerMessageId: null,
            sentAt: null,
            readAt: null,
            failureReason: null,
        });
    }
    async onRideCompleted(payload) {
        await this.send({
            userId: payload.userId,
            channel: notification_entity_1.NotificationChannel.PUSH,
            category: notification_entity_1.NotificationCategory.RIDE,
            status: notification_entity_1.NotificationStatus.PENDING,
            title: '✅ Course terminée',
            body: `Course terminée. Montant: ${payload.amount} ${payload.currency}`,
            data: { rideId: payload.rideId, amount: payload.amount },
            providerMessageId: null,
            sentAt: null,
            readAt: null,
            failureReason: null,
        });
    }
    async onRideCancelled(payload) {
        await this.send({
            userId: payload.userId,
            channel: notification_entity_1.NotificationChannel.PUSH,
            category: notification_entity_1.NotificationCategory.RIDE,
            status: notification_entity_1.NotificationStatus.PENDING,
            title: '❌ Course annulée',
            body: 'Votre course a été annulée.',
            data: { rideId: payload.rideId },
            providerMessageId: null,
            sentAt: null,
            readAt: null,
            failureReason: null,
        });
    }
    async onPaymentSuccess(payload) {
        await this.send({
            userId: payload.userId,
            channel: notification_entity_1.NotificationChannel.PUSH,
            category: notification_entity_1.NotificationCategory.PAYMENT,
            status: notification_entity_1.NotificationStatus.PENDING,
            title: '💳 Paiement confirmé',
            body: `Paiement de ${payload.amount} ${payload.currency} confirmé.`,
            data: { paymentId: payload.paymentId },
            providerMessageId: null,
            sentAt: null,
            readAt: null,
            failureReason: null,
        });
    }
    async onUserRegistered(payload) {
        await this.send({
            userId: payload.userId,
            channel: notification_entity_1.NotificationChannel.SMS,
            category: notification_entity_1.NotificationCategory.SYSTEM,
            status: notification_entity_1.NotificationStatus.PENDING,
            title: 'Bienvenue sur SuperApp BF 🇧🇫',
            body: `Bienvenue ! Votre code de parrainage: ${payload.referralCode ?? 'N/A'}`,
            data: null,
            providerMessageId: null,
            sentAt: null,
            readAt: null,
            failureReason: null,
        });
    }
    async onWalletCredited(payload) {
        await this.send({
            userId: payload.userId,
            channel: notification_entity_1.NotificationChannel.IN_APP,
            category: notification_entity_1.NotificationCategory.PAYMENT,
            status: notification_entity_1.NotificationStatus.PENDING,
            title: '💰 Wallet crédité',
            body: `+${payload.amount / 100} XOF. Nouveau solde: ${payload.newBalance / 100} XOF`,
            data: { amount: payload.amount },
            providerMessageId: null,
            sentAt: null,
            readAt: null,
            failureReason: null,
        });
    }
    async getUnread(userId) {
        return this.repo.find({
            where: { userId, status: notification_entity_1.NotificationStatus.SENT },
            order: { createdAt: 'DESC' },
            take: 50,
        });
    }
    async markAsRead(id) {
        await this.repo.update(id, { status: notification_entity_1.NotificationStatus.READ, readAt: new Date() });
    }
};
exports.NotificationsService = NotificationsService;
__decorate([
    (0, event_emitter_1.OnEvent)(domain_events_constants_1.DomainEvents.RIDE_ACCEPTED),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationsService.prototype, "onRideAccepted", null);
__decorate([
    (0, event_emitter_1.OnEvent)(domain_events_constants_1.DomainEvents.RIDE_COMPLETED),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationsService.prototype, "onRideCompleted", null);
__decorate([
    (0, event_emitter_1.OnEvent)(domain_events_constants_1.DomainEvents.RIDE_CANCELLED),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationsService.prototype, "onRideCancelled", null);
__decorate([
    (0, event_emitter_1.OnEvent)(domain_events_constants_1.DomainEvents.PAYMENT_SUCCESS),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationsService.prototype, "onPaymentSuccess", null);
__decorate([
    (0, event_emitter_1.OnEvent)(domain_events_constants_1.DomainEvents.USER_REGISTERED),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationsService.prototype, "onUserRegistered", null);
__decorate([
    (0, event_emitter_1.OnEvent)(domain_events_constants_1.DomainEvents.WALLET_CREDITED),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationsService.prototype, "onWalletCredited", null);
exports.NotificationsService = NotificationsService = NotificationsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(notification_entity_1.Notification)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], NotificationsService);
//# sourceMappingURL=notifications.service.js.map