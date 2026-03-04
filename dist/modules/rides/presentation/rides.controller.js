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
exports.RidesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const create_ride_usecase_1 = require("../application/use-cases/create-ride.usecase");
const accept_ride_usecase_1 = require("../application/use-cases/accept-ride.usecase");
const complete_ride_usecase_1 = require("../application/use-cases/complete-ride.usecase");
const create_ride_dto_1 = require("../application/dto/create-ride.dto");
const ride_actions_dto_1 = require("../application/dto/ride-actions.dto");
const common_2 = require("@nestjs/common");
const ride_repository_interface_1 = require("../domain/interfaces/ride-repository.interface");
let RidesController = class RidesController {
    createRide;
    acceptRide;
    completeRide;
    rideRepo;
    constructor(createRide, acceptRide, completeRide, rideRepo) {
        this.createRide = createRide;
        this.acceptRide = acceptRide;
        this.completeRide = completeRide;
        this.rideRepo = rideRepo;
    }
    async create(req, dto) {
        return this.createRide.execute(req.user.id, req.user.cityId, dto);
    }
    async list(req, page = 1, limit = 20) {
        return this.rideRepo.findByUserId(req.user.id, { page: +page, limit: +limit });
    }
    async findOne(id) {
        return this.rideRepo.findById(id);
    }
    async accept(id, req) {
        return this.acceptRide.execute(id, req.user.id);
    }
    async complete(id, finalPrice) {
        return this.completeRide.execute(id, finalPrice);
    }
    async cancel(id, dto) {
        return { message: 'Ride cancelled', rideId: id, reason: dto.reason };
    }
    async modify(id, dto, req) {
        return { message: 'Ride modified', rideId: id };
    }
    async rate(id, dto) {
        return { message: 'Rating saved', rideId: id, rating: dto.rating };
    }
};
exports.RidesController = RidesController;
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Créer une nouvelle course (ou planifiée)' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_ride_dto_1.CreateRideDto]),
    __metadata("design:returntype", Promise)
], RidesController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Historique des courses de l\'utilisateur' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], RidesController.prototype, "list", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Détail d\'une course' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], RidesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id/accept'),
    (0, swagger_1.ApiOperation)({ summary: 'Chauffeur accepte la course' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], RidesController.prototype, "accept", null);
__decorate([
    (0, common_1.Patch)(':id/complete'),
    (0, swagger_1.ApiOperation)({ summary: 'Marquer la course comme terminée' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)('finalPrice')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number]),
    __metadata("design:returntype", Promise)
], RidesController.prototype, "complete", null);
__decorate([
    (0, common_1.Patch)(':id/cancel'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Annuler une course' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, ride_actions_dto_1.CancelRideDto]),
    __metadata("design:returntype", Promise)
], RidesController.prototype, "cancel", null);
__decorate([
    (0, common_1.Patch)(':id/modify'),
    (0, swagger_1.ApiOperation)({ summary: 'Modifier une course planifiée' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, ride_actions_dto_1.ModifyRideDto, Object]),
    __metadata("design:returntype", Promise)
], RidesController.prototype, "modify", null);
__decorate([
    (0, common_1.Post)(':id/rate'),
    (0, swagger_1.ApiOperation)({ summary: 'Évaluer une course terminée' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, ride_actions_dto_1.RateRideDto]),
    __metadata("design:returntype", Promise)
], RidesController.prototype, "rate", null);
exports.RidesController = RidesController = __decorate([
    (0, swagger_1.ApiTags)('Rides'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)({ path: 'rides', version: '1' }),
    __param(3, (0, common_2.Inject)(ride_repository_interface_1.RIDE_REPOSITORY)),
    __metadata("design:paramtypes", [create_ride_usecase_1.CreateRideUseCase,
        accept_ride_usecase_1.AcceptRideUseCase,
        complete_ride_usecase_1.CompleteRideUseCase, Object])
], RidesController);
//# sourceMappingURL=rides.controller.js.map