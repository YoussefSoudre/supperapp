import { UsersService } from '../application/users.service';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    getMe(req: {
        user: {
            id: string;
        };
    }): Promise<import("../domain/entities/user.entity").User>;
    updateMe(req: {
        user: {
            id: string;
        };
    }, data: Partial<{
        firstName: string;
        lastName: string;
        email: string;
        avatarUrl: string;
    }>): Promise<import("../domain/entities/user.entity").User>;
    updateFcmToken(req: {
        user: {
            id: string;
        };
    }, fcmToken: string): Promise<void>;
    findOne(id: string): Promise<import("../domain/entities/user.entity").User>;
}
