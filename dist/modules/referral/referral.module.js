"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReferralModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const referral_program_entity_1 = require("./domain/entities/referral-program.entity");
const referral_usage_entity_1 = require("./domain/entities/referral-usage.entity");
const referral_controller_1 = require("./presentation/referral.controller");
const referral_service_1 = require("./application/referral.service");
let ReferralModule = class ReferralModule {
};
exports.ReferralModule = ReferralModule;
exports.ReferralModule = ReferralModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([referral_program_entity_1.ReferralProgram, referral_usage_entity_1.ReferralUsage])],
        controllers: [referral_controller_1.ReferralController],
        providers: [referral_service_1.ReferralService],
        exports: [referral_service_1.ReferralService],
    })
], ReferralModule);
//# sourceMappingURL=referral.module.js.map