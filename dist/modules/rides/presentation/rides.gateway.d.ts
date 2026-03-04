import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { EventBusService } from '../../../shared/events/event-bus.service';
export declare class RidesGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private readonly eventBus;
    server: Server;
    private readonly logger;
    constructor(eventBus: EventBusService);
    handleConnection(client: Socket): void;
    handleDisconnect(client: Socket): void;
    handleDriverLocation(client: Socket, data: {
        rideId: string;
        driverId: string;
        lat: number;
        lng: number;
    }): Promise<void>;
    handleJoinRide(client: Socket, data: {
        rideId: string;
    }): void;
    broadcastStatusChange(rideId: string, status: string): void;
}
