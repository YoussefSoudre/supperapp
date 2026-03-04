import { AuthService } from '../application/auth.service';
import { LoginDto } from '../application/dto/login.dto';
import { RegisterDto } from '../application/dto/register.dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    register(dto: RegisterDto, cityId: string): Promise<{
        access_token: string;
        user: Partial<import("../../users/domain/entities/user.entity").User>;
    }>;
    login(dto: LoginDto): Promise<{
        access_token: string;
        user: Partial<import("../../users/domain/entities/user.entity").User>;
    }>;
}
