import { NotificationsService } from '../application/notifications.service';
export declare class NotificationsController {
    private readonly notificationsService;
    constructor(notificationsService: NotificationsService);
    getUnread(req: {
        user: {
            id: string;
        };
    }): Promise<import("../domain/entities/notification.entity").Notification[]>;
    markAsRead(id: string): Promise<void>;
}
