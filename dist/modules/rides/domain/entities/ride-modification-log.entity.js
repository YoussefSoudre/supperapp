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
exports.RideModificationLog = exports.ModificationField = void 0;
const typeorm_1 = require("typeorm");
var ModificationField;
(function (ModificationField) {
    ModificationField["DROPOFF_ADDRESS"] = "dropoff_address";
    ModificationField["SCHEDULED_AT"] = "scheduled_at";
    ModificationField["RIDE_TYPE"] = "ride_type";
    ModificationField["PICKUP_ADDRESS"] = "pickup_address";
})(ModificationField || (exports.ModificationField = ModificationField = {}));
let RideModificationLog = class RideModificationLog {
    id;
    rideId;
    modifiedById;
    field;
    oldValue;
    newValue;
    reason;
    createdAt;
};
exports.RideModificationLog = RideModificationLog;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], RideModificationLog.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', name: 'ride_id' }),
    __metadata("design:type", String)
], RideModificationLog.prototype, "rideId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', name: 'modified_by_id' }),
    __metadata("design:type", String)
], RideModificationLog.prototype, "modifiedById", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: ModificationField, name: 'field' }),
    __metadata("design:type", String)
], RideModificationLog.prototype, "field", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', name: 'old_value' }),
    __metadata("design:type", String)
], RideModificationLog.prototype, "oldValue", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', name: 'new_value' }),
    __metadata("design:type", String)
], RideModificationLog.prototype, "newValue", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], RideModificationLog.prototype, "reason", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], RideModificationLog.prototype, "createdAt", void 0);
exports.RideModificationLog = RideModificationLog = __decorate([
    (0, typeorm_1.Entity)('ride_modification_logs'),
    (0, typeorm_1.Index)('idx_rml_ride', ['rideId', 'createdAt']),
    (0, typeorm_1.Index)('idx_rml_user', ['modifiedById'])
], RideModificationLog);
//# sourceMappingURL=ride-modification-log.entity.js.map