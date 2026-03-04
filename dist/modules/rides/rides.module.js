"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RidesModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const ride_entity_1 = require("./domain/entities/ride.entity");
const ride_modification_log_entity_1 = require("./domain/entities/ride-modification-log.entity");
const ride_repository_interface_1 = require("./domain/interfaces/ride-repository.interface");
const ride_repository_1 = require("./infrastructure/repositories/ride.repository");
const create_ride_usecase_1 = require("./application/use-cases/create-ride.usecase");
const accept_ride_usecase_1 = require("./application/use-cases/accept-ride.usecase");
const complete_ride_usecase_1 = require("./application/use-cases/complete-ride.usecase");
const rides_controller_1 = require("./presentation/rides.controller");
const rides_gateway_1 = require("./presentation/rides.gateway");
let RidesModule = class RidesModule {
};
exports.RidesModule = RidesModule;
exports.RidesModule = RidesModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([ride_entity_1.Ride, ride_modification_log_entity_1.RideModificationLog]),
        ],
        controllers: [rides_controller_1.RidesController],
        providers: [
            { provide: ride_repository_interface_1.RIDE_REPOSITORY, useClass: ride_repository_1.RideRepository },
            create_ride_usecase_1.CreateRideUseCase,
            accept_ride_usecase_1.AcceptRideUseCase,
            complete_ride_usecase_1.CompleteRideUseCase,
            rides_gateway_1.RidesGateway,
        ],
        exports: [ride_repository_interface_1.RIDE_REPOSITORY],
    })
], RidesModule);
//# sourceMappingURL=rides.module.js.map