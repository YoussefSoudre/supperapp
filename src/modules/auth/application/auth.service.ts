import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { User, UserStatus } from '../../users/domain/entities/user.entity';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { DomainEvents, UserRegisteredPayload, UserPhoneVerifiedPayload } from '../../../shared/events/domain-events.constants';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { TokenService } from './services/token.service';
import { OtpService } from './services/otp.service';

export interface AuthTokens {
  access_token:  string;
  refresh_token: string;
  expires_in:    number;
  user:          Partial<User>;
  message?:      string;
  welcome?:      string;
}

export interface PendingVerificationResponse {
  message: string;
  phone: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly tokenService: TokenService,
    private readonly eventBus: EventBusService,
    private readonly otpService: OtpService,
  ) {}

  private normalizePhone(phone: string): string {
    return phone.startsWith('+') ? phone : `+226${phone}`;
  }

  async register(dto: RegisterDto, cityId: string): Promise<PendingVerificationResponse> {
    dto.phone = this.normalizePhone(dto.phone);
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
      status: UserStatus.INACTIVE,   // compte inactif jusqu'à vérification OTP
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

    // Envoi automatique de l'OTP dès l'inscription
    await this.otpService.sendOtp(saved.phone);

    return {
      message: 'Account created. Please verify your phone number with the OTP sent by SMS.',
      phone: saved.phone,
    };
  }

  async login(dto: LoginDto): Promise<AuthTokens> {
    dto.phone = this.normalizePhone(dto.phone);
    const user = await this.userRepo
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.phone = :phone', { phone: dto.phone })
      .getOne();

    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status === UserStatus.INACTIVE) {
      throw new UnauthorizedException(
        'Phone number not verified. Please verify your phone with the OTP sent during registration.',
      );
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

  /**
   * Vérifie l'OTP, active le compte et retourne les tokens JWT.
   * Appelé depuis POST /auth/otp/verify.
   */
  async verifyPhone(phone: string, code: string): Promise<AuthTokens> {
    const normalizedPhone = this.normalizePhone(phone);

    await this.otpService.verifyOtp(normalizedPhone, code);

    const user = await this.userRepo.findOne({ where: { phone: normalizedPhone } });
    if (!user) throw new UnauthorizedException('User not found');

    // Activer le compte
    user.phoneVerified = true;
    user.status = UserStatus.ACTIVE;
    await this.userRepo.save(user);

    // Émettre l’événement — le module Notifications enverra la notification de bienvenue
    const verifiedPayload: UserPhoneVerifiedPayload = {
      version: 1,
      userId: user.id,
      phone: user.phone,
      firstName: user.firstName,
      cityId: user.cityId,
      timestamp: new Date(),
    };
    await this.eventBus.emit(DomainEvents.USER_PHONE_VERIFIED, verifiedPayload);

    const tokens = await this.tokenService.issueTokenPair(user.id, user.phone, user.cityId);
    const { passwordHash: _, ...userWithoutPassword } = user;
    return {
      ...tokens,
      user: userWithoutPassword,
      message: 'Your account has been successfully verified.',
      welcome: `Welcome to Superapp, ${user.firstName}! We're excited to have you on board. 🎉`,
    };
  }

  private generateReferralCode(firstName: string): string {
    const suffix = uuidv4().substring(0, 6).toUpperCase();
    return `${firstName.substring(0, 4).toUpperCase()}-${suffix}`;
  }
}
