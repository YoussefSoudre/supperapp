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
exports.PaymentsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const payment_entity_1 = require("../domain/entities/payment.entity");
const orange_money_provider_1 = require("../infrastructure/providers/orange-money.provider");
const moov_money_provider_1 = require("../infrastructure/providers/moov-money.provider");
const event_bus_service_1 = require("../../../shared/events/event-bus.service");
const domain_events_constants_1 = require("../../../shared/events/domain-events.constants");
let PaymentsService = class PaymentsService {
    repo;
    eventBus;
    providers;
    constructor(repo, eventBus, orangeMoney, moovMoney) {
        this.repo = repo;
        this.eventBus = eventBus;
        this.providers = new Map([
            [orangeMoney.name, orangeMoney],
            [moovMoney.name, moovMoney],
        ]);
    }
    getProvider(name) {
        const provider = this.providers.get(name);
        if (!provider)
            throw new common_1.BadRequestException(`Payment provider '${name}' not supported`);
        return provider;
    }
    async initiate(dto) {
        const provider = this.getProvider(dto.provider);
        const payment = await this.repo.save(this.repo.create({
            userId: dto.userId,
            serviceType: dto.serviceType,
            referenceId: dto.referenceId,
            amount: dto.amount,
            currency: 'XOF',
            status: payment_entity_1.PaymentStatus.PENDING,
            provider: dto.provider,
            providerPhone: dto.phone,
        }));
        const intent = await provider.initiate({
            amount: dto.amount,
            currency: 'XOF',
            phone: dto.phone,
            reference: payment.id,
            description: `Paiement ${dto.serviceType}`,
        });
        await this.repo.update(payment.id, {
            status: payment_entity_1.PaymentStatus.PROCESSING,
            providerTxId: intent.providerReference,
        });
        await this.eventBus.emit(domain_events_constants_1.DomainEvents.PAYMENT_INITIATED, {
            version: 1, paymentId: payment.id, userId: dto.userId,
            amount: dto.amount, provider: dto.provider, timestamp: new Date(),
        });
        return { ...payment, status: payment_entity_1.PaymentStatus.PROCESSING };
    }
    async confirmSuccess(paymentId, providerTxId) {
        const payment = await this.repo.findOne({ where: { id: paymentId } });
        if (!payment)
            throw new common_1.NotFoundException('Payment not found');
        await this.repo.update(paymentId, {
            status: payment_entity_1.PaymentStatus.SUCCESS,
            providerTxId,
            paidAt: new Date(),
        });
        const payload = {
            version: 1,
            paymentId,
            userId: payment.userId,
            amount: payment.amount,
            currency: payment.currency,
            serviceType: payment.serviceType,
            referenceId: payment.referenceId,
            provider: payment.provider,
            timestamp: new Date(),
        };
        await this.eventBus.emit(domain_events_constants_1.DomainEvents.PAYMENT_SUCCESS, payload);
    }
};
exports.PaymentsService = PaymentsService;
exports.PaymentsService = PaymentsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(payment_entity_1.Payment)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        event_bus_service_1.EventBusService,
        orange_money_provider_1.OrangeMoneyProvider,
        moov_money_provider_1.MoovMoneyProvider])
], PaymentsService);
//# sourceMappingURL=payments.service.js.map