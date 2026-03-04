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
Object.defineProperty(exports, "__esModule", { value: true });
exports.WalletService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const event_emitter_1 = require("@nestjs/event-emitter");
const wallet_entity_1 = require("../domain/entities/wallet.entity");
const wallet_transaction_entity_1 = require("../domain/entities/wallet-transaction.entity");
const event_bus_service_1 = require("../../../shared/events/event-bus.service");
const domain_events_constants_1 = require("../../../shared/events/domain-events.constants");
let WalletService = class WalletService {
    walletRepo;
    txRepo;
    dataSource;
    eventBus;
    constructor(walletRepo, txRepo, dataSource, eventBus) {
        this.walletRepo = walletRepo;
        this.txRepo = txRepo;
        this.dataSource = dataSource;
        this.eventBus = eventBus;
    }
    async findByUserId(userId) {
        const wallet = await this.walletRepo.findOne({ where: { userId } });
        if (!wallet)
            throw new common_1.NotFoundException('Wallet not found');
        return wallet;
    }
    async getTransactions(userId, page = 1, limit = 20) {
        const wallet = await this.findByUserId(userId);
        const [data, total] = await this.txRepo.findAndCount({
            where: { walletId: wallet.id },
            order: { createdAt: 'DESC' },
            skip: (page - 1) * limit,
            take: limit,
        });
        return { data, total, page, limit };
    }
    async credit(userId, amountCentimes, reason, referenceId) {
        return this.dataSource.transaction(async (manager) => {
            const wallet = await manager
                .createQueryBuilder(wallet_entity_1.Wallet, 'wallet')
                .where('wallet.userId = :userId', { userId })
                .setLock('pessimistic_write')
                .getOneOrFail();
            if (wallet.status !== wallet_entity_1.WalletStatus.ACTIVE) {
                throw new common_1.BadRequestException('Wallet is not active');
            }
            const newBalance = Number(wallet.balance) + amountCentimes;
            await manager.update(wallet_entity_1.Wallet, wallet.id, { balance: newBalance, version: wallet.version + 1 });
            const tx = manager.create(wallet_transaction_entity_1.WalletTransaction, {
                walletId: wallet.id,
                type: wallet_transaction_entity_1.TransactionType.CREDIT,
                reason,
                amount: amountCentimes,
                balanceAfter: newBalance,
                currency: wallet.currency,
                referenceId: referenceId ?? null,
            });
            const saved = await manager.save(wallet_transaction_entity_1.WalletTransaction, tx);
            await this.eventBus.emit(domain_events_constants_1.DomainEvents.WALLET_CREDITED, {
                version: 1, userId, walletId: wallet.id, amount: amountCentimes,
                newBalance, reason, timestamp: new Date(),
            });
            return saved;
        });
    }
    async onRideCompleted(payload) {
        const driverAmount = Math.floor(payload.amount * 80);
        await this.credit(payload.driverId, driverAmount, wallet_transaction_entity_1.TransactionReason.RIDE_EARNING, payload.rideId);
    }
    async onPaymentSuccess(payload) {
        if (payload.serviceType === 'wallet_topup') {
            const amountCentimes = payload.amount * 100;
            await this.credit(payload.userId, amountCentimes, wallet_transaction_entity_1.TransactionReason.TOPUP, payload.paymentId);
        }
    }
};
exports.WalletService = WalletService;
__decorate([
    (0, event_emitter_1.OnEvent)(domain_events_constants_1.DomainEvents.RIDE_COMPLETED),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], WalletService.prototype, "onRideCompleted", null);
__decorate([
    (0, event_emitter_1.OnEvent)(domain_events_constants_1.DomainEvents.PAYMENT_SUCCESS),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], WalletService.prototype, "onPaymentSuccess", null);
exports.WalletService = WalletService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(wallet_entity_1.Wallet)),
    __param(1, (0, typeorm_1.InjectRepository)(wallet_transaction_entity_1.WalletTransaction)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.DataSource,
        event_bus_service_1.EventBusService])
], WalletService);
//# sourceMappingURL=wallet.service.js.map