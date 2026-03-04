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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Payment = exports.PaymentServiceType = exports.PaymentProvider = exports.PaymentStatus = void 0;
const typeorm_1 = require("typeorm");
var PaymentStatus;
(function (PaymentStatus) {
    PaymentStatus["PENDING"] = "pending";
    PaymentStatus["PROCESSING"] = "processing";
    PaymentStatus["SUCCESS"] = "success";
    PaymentStatus["FAILED"] = "failed";
    PaymentStatus["REFUNDED"] = "refunded";
    PaymentStatus["CANCELLED"] = "cancelled";
})(PaymentStatus || (exports.PaymentStatus = PaymentStatus = {}));
var PaymentProvider;
(function (PaymentProvider) {
    PaymentProvider["ORANGE_MONEY"] = "orange_money";
    PaymentProvider["MOOV_MONEY"] = "moov_money";
    PaymentProvider["CORIS_BANK"] = "coris_bank";
    PaymentProvider["WALLET"] = "wallet";
    PaymentProvider["CASH"] = "cash";
})(PaymentProvider || (exports.PaymentProvider = PaymentProvider = {}));
var PaymentServiceType;
(function (PaymentServiceType) {
    PaymentServiceType["RIDE"] = "ride";
    PaymentServiceType["DELIVERY"] = "delivery";
    PaymentServiceType["FOOD"] = "food";
    PaymentServiceType["WALLET_TOPUP"] = "wallet_topup";
    PaymentServiceType["WITHDRAWAL"] = "withdrawal";
})(PaymentServiceType || (exports.PaymentServiceType = PaymentServiceType = {}));
let Payment = class Payment {
    id;
    userId;
    serviceType;
    referenceId;
    amount;
    currency;
    status;
    provider;
    providerPhone;
    providerTxId;
    providerResponse;
    paidAt;
    retryCount;
    failureReason;
    metadata;
    createdAt;
    updatedAt;
};
exports.Payment = Payment;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Payment.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', name: 'user_id' }),
    __metadata("design:type", String)
], Payment.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: PaymentServiceType, name: 'service_type' }),
    __metadata("design:type", String)
], Payment.prototype, "serviceType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', name: 'reference_id' }),
    __metadata("design:type", String)
], Payment.prototype, "referenceId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 12, scale: 2 }),
    __metadata("design:type", Number)
], Payment.prototype, "amount", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 3, default: 'XOF' }),
    __metadata("design:type", String)
], Payment.prototype, "currency", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING }),
    __metadata("design:type", String)
], Payment.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: PaymentProvider }),
    __metadata("design:type", String)
], Payment.prototype, "provider", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 20, nullable: true, name: 'provider_phone' }),
    __metadata("design:type", Object)
], Payment.prototype, "providerPhone", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 255, nullable: true, name: 'provider_tx_id' }),
    __metadata("design:type", Object)
], Payment.prototype, "providerTxId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true, name: 'provider_response' }),
    __metadata("design:type", Object)
], Payment.prototype, "providerResponse", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true, name: 'paid_at' }),
    __metadata("design:type", Object)
], Payment.prototype, "paidAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer', default: 0, name: 'retry_count' }),
    __metadata("design:type", Number)
], Payment.prototype, "retryCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true, name: 'failure_reason' }),
    __metadata("design:type", Object)
], Payment.prototype, "failureReason", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], Payment.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], Payment.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], Payment.prototype, "updatedAt", void 0);
exports.Payment = Payment = __decorate([
    (0, typeorm_1.Entity)('payments'),
    (0, typeorm_1.Index)('idx_payments_user', ['userId', 'status', 'createdAt']),
    (0, typeorm_1.Index)('idx_payments_reference', ['referenceId', 'serviceType']),
    (0, typeorm_1.Index)('idx_payments_provider_tx', ['providerTxId'], { where: '"provider_tx_id" IS NOT NULL' }),
    (0, typeorm_1.Index)('idx_payments_pending', ['status', 'createdAt'], { where: '"status" IN (\'pending\', \'processing\')' })
], Payment);
//# sourceMappingURL=payment.entity.js.map