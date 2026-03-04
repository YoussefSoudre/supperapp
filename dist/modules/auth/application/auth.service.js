"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const jwt_1 = require("@nestjs/jwt");
const bcrypt = __importStar(require("bcrypt"));
const uuid_1 = require("uuid");
const user_entity_1 = require("../../users/domain/entities/user.entity");
const event_bus_service_1 = require("../../../shared/events/event-bus.service");
const domain_events_constants_1 = require("../../../shared/events/domain-events.constants");
let AuthService = class AuthService {
    userRepo;
    jwtService;
    eventBus;
    constructor(userRepo, jwtService, eventBus) {
        this.userRepo = userRepo;
        this.jwtService = jwtService;
        this.eventBus = eventBus;
    }
    async register(dto, cityId) {
        const existing = await this.userRepo.findOne({ where: { phone: dto.phone } });
        if (existing)
            throw new common_1.ConflictException('Phone number already registered');
        const passwordHash = await bcrypt.hash(dto.password, 12);
        const referralCode = this.generateReferralCode(dto.firstName);
        const user = this.userRepo.create({
            firstName: dto.firstName,
            lastName: dto.lastName,
            phone: dto.phone,
            email: dto.email ?? null,
            passwordHash,
            cityId,
            referralCode,
            referredById: null,
            status: user_entity_1.UserStatus.ACTIVE,
            phoneVerified: false,
            kycVerified: false,
            avatarUrl: null,
            fcmToken: null,
            metadata: null,
            deletedAt: null,
        });
        const saved = await this.userRepo.save(user);
        const payload = {
            version: 1,
            userId: saved.id,
            phone: saved.phone,
            referralCode: dto.referralCode,
            cityId,
            timestamp: new Date(),
        };
        await this.eventBus.emit(domain_events_constants_1.DomainEvents.USER_REGISTERED, payload);
        const token = this.jwtService.sign({ sub: saved.id, phone: saved.phone, cityId });
        const { passwordHash: _, ...userWithoutPassword } = saved;
        return { access_token: token, user: userWithoutPassword };
    }
    async login(dto) {
        const user = await this.userRepo
            .createQueryBuilder('user')
            .addSelect('user.passwordHash')
            .where('user.phone = :phone', { phone: dto.phone })
            .getOne();
        if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        if (user.status === user_entity_1.UserStatus.SUSPENDED) {
            throw new common_1.UnauthorizedException('Account suspended');
        }
        const token = this.jwtService.sign({ sub: user.id, phone: user.phone, cityId: user.cityId });
        const { passwordHash: _, ...userWithoutPassword } = user;
        return { access_token: token, user: userWithoutPassword };
    }
    generateReferralCode(firstName) {
        const suffix = (0, uuid_1.v4)().substring(0, 6).toUpperCase();
        return `${firstName.substring(0, 4).toUpperCase()}-${suffix}`;
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        jwt_1.JwtService,
        event_bus_service_1.EventBusService])
], AuthService);
//# sourceMappingURL=auth.service.js.map