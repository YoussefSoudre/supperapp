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
exports.RideRepository = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const ride_entity_1 = require("../../domain/entities/ride.entity");
let RideRepository = class RideRepository {
    repo;
    constructor(repo) {
        this.repo = repo;
    }
    async findById(id) {
        return this.repo.findOne({ where: { id } });
    }
    async findByUserId(userId, options = {}) {
        const { page = 1, limit = 20, filters = {}, orderBy = 'createdAt', order = 'DESC' } = options;
        const qb = this.repo.createQueryBuilder('ride')
            .where('ride.userId = :userId', { userId });
        if (filters['status']) {
            const statuses = Array.isArray(filters['status']) ? filters['status'] : [filters['status']];
            qb.andWhere('ride.status IN (:...statuses)', { statuses });
        }
        const [data, total] = await qb
            .orderBy(`ride.${orderBy}`, order)
            .skip((page - 1) * limit)
            .take(limit)
            .getManyAndCount();
        return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
    }
    async findByDriverId(driverId, options = {}) {
        const { page = 1, limit = 20 } = options;
        const [data, total] = await this.repo.findAndCount({
            where: { driverId },
            order: { createdAt: 'DESC' },
            skip: (page - 1) * limit,
            take: limit,
        });
        return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
    }
    async findPendingScheduled(before) {
        return this.repo.find({
            where: {
                status: ride_entity_1.RideStatus.SCHEDULED,
                scheduledAt: (0, typeorm_2.LessThanOrEqual)(before),
            },
        });
    }
    async save(rideData) {
        const ride = this.repo.create(rideData);
        return this.repo.save(ride);
    }
    async update(id, data) {
        await this.repo.update(id, data);
        return this.repo.findOneOrFail({ where: { id } });
    }
    async countActiveRidesByDriver(driverId) {
        return this.repo.count({
            where: {
                driverId,
                status: (0, typeorm_2.In)([ride_entity_1.RideStatus.ACCEPTED, ride_entity_1.RideStatus.DRIVER_EN_ROUTE, ride_entity_1.RideStatus.IN_PROGRESS]),
            },
        });
    }
};
exports.RideRepository = RideRepository;
exports.RideRepository = RideRepository = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(ride_entity_1.Ride)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], RideRepository);
//# sourceMappingURL=ride.repository.js.map