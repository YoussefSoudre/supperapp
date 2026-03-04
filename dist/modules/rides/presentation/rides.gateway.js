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
var RidesGateway_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RidesGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const common_1 = require("@nestjs/common");
const event_bus_service_1 = require("../../../shared/events/event-bus.service");
const domain_events_constants_1 = require("../../../shared/events/domain-events.constants");
let RidesGateway = RidesGateway_1 = class RidesGateway {
    eventBus;
    server;
    logger = new common_1.Logger(RidesGateway_1.name);
    constructor(eventBus) {
        this.eventBus = eventBus;
    }
    handleConnection(client) {
        this.logger.debug(`Client connected: ${client.id}`);
    }
    handleDisconnect(client) {
        this.logger.debug(`Client disconnected: ${client.id}`);
    }
    async handleDriverLocation(client, data) {
        this.server.to(`ride:${data.rideId}`).emit('driver:location:update', {
            lat: data.lat,
            lng: data.lng,
            timestamp: new Date().toISOString(),
        });
        await this.eventBus.emit(domain_events_constants_1.DomainEvents.DRIVER_LOCATION_UPDATED, {
            version: 1,
            driverId: data.driverId,
            rideId: data.rideId,
            lat: data.lat,
            lng: data.lng,
            timestamp: new Date(),
        });
    }
    handleJoinRide(client, data) {
        void client.join(`ride:${data.rideId}`);
        this.logger.debug(`Client ${client.id} joined room ride:${data.rideId}`);
    }
    broadcastStatusChange(rideId, status) {
        this.server.to(`ride:${rideId}`).emit('ride:status:changed', { rideId, status });
    }
};
exports.RidesGateway = RidesGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], RidesGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('driver:location'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], RidesGateway.prototype, "handleDriverLocation", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('ride:join'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], RidesGateway.prototype, "handleJoinRide", null);
exports.RidesGateway = RidesGateway = RidesGateway_1 = __decorate([
    (0, websockets_1.WebSocketGateway)({ namespace: '/rides', cors: { origin: '*' } }),
    __metadata("design:paramtypes", [event_bus_service_1.EventBusService])
], RidesGateway);
//# sourceMappingURL=rides.gateway.js.map