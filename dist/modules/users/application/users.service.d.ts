import { Repository } from 'typeorm';
import { User } from '../domain/entities/user.entity';
export declare class UsersService {
    private readonly repo;
    constructor(repo: Repository<User>);
    findById(id: string): Promise<User>;
    update(id: string, data: Partial<User>): Promise<User>;
    updateFcmToken(id: string, fcmToken: string): Promise<void>;
}
