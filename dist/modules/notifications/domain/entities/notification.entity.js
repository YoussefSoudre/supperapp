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
exports.Notification = exports.NotificationCategory = exports.NotificationStatus = exports.NotificationChannel = void 0;
const typeorm_1 = require("typeorm");
var NotificationChannel;
(function (NotificationChannel) {
    NotificationChannel["PUSH"] = "push";
    NotificationChannel["SMS"] = "sms";
    NotificationChannel["EMAIL"] = "email";
    NotificationChannel["IN_APP"] = "in_app";
})(NotificationChannel || (exports.NotificationChannel = NotificationChannel = {}));
var NotificationStatus;
(function (NotificationStatus) {
    NotificationStatus["PENDING"] = "pending";
    NotificationStatus["SENT"] = "sent";
    NotificationStatus["FAILED"] = "failed";
    NotificationStatus["READ"] = "read";
})(NotificationStatus || (exports.NotificationStatus = NotificationStatus = {}));
var NotificationCategory;
(function (NotificationCategory) {
    NotificationCategory["RIDE"] = "ride";
    NotificationCategory["PAYMENT"] = "payment";
    NotificationCategory["PROMO"] = "promo";
    NotificationCategory["SYSTEM"] = "system";
    NotificationCategory["REFERRAL"] = "referral";
    NotificationCategory["DELIVERY"] = "delivery";
    NotificationCategory["FOOD"] = "food";
})(NotificationCategory || (exports.NotificationCategory = NotificationCategory = {}));
let Notification = class Notification {
    id;
    userId;
    channel;
    category;
    status;
    title;
    body;
    data;
    providerMessageId;
    sentAt;
    readAt;
    failureReason;
    createdAt;
};
exports.Notification = Notification;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Notification.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', name: 'user_id' }),
    __metadata("design:type", String)
], Notification.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: NotificationChannel }),
    __metadata("design:type", String)
], Notification.prototype, "channel", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: NotificationCategory }),
    __metadata("design:type", String)
], Notification.prototype, "category", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: NotificationStatus, default: NotificationStatus.PENDING }),
    __metadata("design:type", String)
], Notification.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 250 }),
    __metadata("design:type", String)
], Notification.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], Notification.prototype, "body", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], Notification.prototype, "data", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 255, nullable: true, name: 'provider_message_id' }),
    __metadata("design:type", Object)
], Notification.prototype, "providerMessageId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true, name: 'sent_at' }),
    __metadata("design:type", Object)
], Notification.prototype, "sentAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true, name: 'read_at' }),
    __metadata("design:type", Object)
], Notification.prototype, "readAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true, name: 'failure_reason' }),
    __metadata("design:type", Object)
], Notification.prototype, "failureReason", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], Notification.prototype, "createdAt", void 0);
exports.Notification = Notification = __decorate([
    (0, typeorm_1.Entity)('notifications'),
    (0, typeorm_1.Index)('idx_notif_user', ['userId', 'status', 'createdAt']),
    (0, typeorm_1.Index)('idx_notif_unread', ['userId', 'status'], { where: '"status" = \'pending\' OR "status" = \'sent\'' }),
    (0, typeorm_1.Index)('idx_notif_category', ['userId', 'category'])
], Notification);
//# sourceMappingURL=notification.entity.js.map