import { Repository } from 'typeorm';
import { Notification } from '../domain/entities/notification.entity';
import { RideCompletedPayload, UserRegisteredPayload, PaymentSuccessPayload } from '../../../shared/events/domain-events.constants';
export declare class NotificationsService {
    private readonly repo;
    private readonly logger;
    constructor(repo: Repository<Notification>);
    private send;
    onRideAccepted(payload: {
        userId: string;
        driverId: string;
        rideId: string;
    }): Promise<void>;
    onRideCompleted(payload: RideCompletedPayload): Promise<void>;
    onRideCancelled(payload: {
        userId: string;
        rideId: string;
    }): Promise<void>;
    onPaymentSuccess(payload: PaymentSuccessPayload): Promise<void>;
    onUserRegistered(payload: UserRegisteredPayload): Promise<void>;
    onWalletCredited(payload: {
        userId: string;
        amount: number;
        newBalance: number;
    }): Promise<void>;
    getUnread(userId: string): Promise<Notification[]>;
    markAsRead(id: string): Promise<void>;
}
