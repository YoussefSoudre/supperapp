import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { User, UserStatus } from '../../users/domain/entities/user.entity';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { DomainEvents, UserRegisteredPayload } from '../../../shared/events/domain-events.constants';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { TokenService } from './services/token.service';

export interface AuthTokens {
  access_token:  string;
  refresh_token: string;
  expires_in:    number;
  user:          Partial<User>;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly tokenService: TokenService,
    private readonly eventBus: EventBusService,
  ) {}

  async register(dto: RegisterDto, cityId: string): Promise<AuthTokens> {
    const existing = await this.userRepo.findOne({ where: { phone: dto.phone } });
    if (existing) throw new ConflictException('Phone number already registered');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const referralCode = this.generateReferralCode(dto.firstName);

    const user = this.userRepo.create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
      email: dto.email ?? null,
      passwordHash,
      cityId,
      referralCode,
      referredById: null,
      status: UserStatus.ACTIVE,
      phoneVerified: false,
      kycVerified: false,
      avatarUrl: null,
      fcmToken: null,
      metadata: null,
      deletedAt: null,
    });

    const saved = await this.userRepo.save(user);

    const payload: UserRegisteredPayload = {
      version: 1,
      userId: saved.id,
      phone: saved.phone,
      referralCode: dto.referralCode,
      cityId,
      timestamp: new Date(),
    };
    await this.eventBus.emit(DomainEvents.USER_REGISTERED, payload);

    const tokens = await this.tokenService.issueTokenPair(saved.id, saved.phone, cityId);
    const { passwordHash: _, ...userWithoutPassword } = saved;
    return { ...tokens, user: userWithoutPassword };
  }

  async login(dto: LoginDto): Promise<AuthTokens> {
    const user = await this.userRepo
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.phone = :phone', { phone: dto.phone })
      .getOne();

    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new UnauthorizedException('Account suspended');
    }

    const tokens = await this.tokenService.issueTokenPair(user.id, user.phone, user.cityId);
    const { passwordHash: _, ...userWithoutPassword } = user;
    return { ...tokens, user: userWithoutPassword };
  }

  async refreshTokens(refreshToken: string) {
    return this.tokenService.refresh(refreshToken);
  }

  async logout(refreshToken: string): Promise<void> {
    await this.tokenService.revoke(refreshToken);
  }

  async logoutAll(userId: string): Promise<void> {
    await this.tokenService.revokeAll(userId);
  }

  private generateReferralCode(firstName: string): string {
    const suffix = uuidv4().substring(0, 6).toUpperCase();
    return `${firstName.substring(0, 4).toUpperCase()}-${suffix}`;
  }
}
