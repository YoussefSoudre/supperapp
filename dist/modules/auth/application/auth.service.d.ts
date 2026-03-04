import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { User } from '../../users/domain/entities/user.entity';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
export declare class AuthService {
    private readonly userRepo;
    private readonly jwtService;
    private readonly eventBus;
    constructor(userRepo: Repository<User>, jwtService: JwtService, eventBus: EventBusService);
    register(dto: RegisterDto, cityId: string): Promise<{
        access_token: string;
        user: Partial<User>;
    }>;
    login(dto: LoginDto): Promise<{
        access_token: string;
        user: Partial<User>;
    }>;
    private generateReferralCode;
}
