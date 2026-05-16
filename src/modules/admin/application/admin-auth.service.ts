import { Injectable, UnauthorizedException, ForbiddenException, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { User, UserStatus } from '../../users/domain/entities/user.entity';
import { TokenService } from '../../auth/application/services/token.service';
import { RbacService } from './rbac.service';
import { RedisService } from '../../../infrastructure/redis/redis.service';
import { AdminLoginDto, AdminAuthResponseDto, ForgotPasswordDto, ResetPasswordDto } from '../presentation/dto/admin-auth.dto';

const RESET_TOKEN_TTL = 3600; // 1 heure
const RESET_TOKEN_PREFIX = 'pwd_reset:';

export interface AdminAuthResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    phone: string;
    roles: string[];
    permissions: string[];
  };
}

@Injectable()
export class AdminAuthService {
  private readonly logger = new Logger(AdminAuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly tokenService: TokenService,
    private readonly rbacService: RbacService,
    private readonly redis: RedisService,
  ) {}

  async login(dto: AdminLoginDto): Promise<AdminAuthResponse> {
    // 1. Trouver l'utilisateur par email
    const user = await this.userRepo
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email: dto.email.toLowerCase() })
      .getOne();

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 2. Vérifier le mot de passe
    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 3. Vérifier le statut du compte
    if (user.status === UserStatus.INACTIVE) {
      throw new UnauthorizedException('Account not activated');
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new UnauthorizedException('Account suspended');
    }

    // 4. Charger les rôles et permissions de l'utilisateur
    const effectivePerms = await this.rbacService.getEffectivePermissions(user.id);
    const permissions = Array.from(effectivePerms.slugs);
    const userRoles = await this.rbacService.getUserRoles(user.id);

    // 5. Vérifier que l'utilisateur a au moins un rôle (= admin)
    if (userRoles.length === 0) {
      throw new ForbiddenException('Access denied: No admin role assigned');
    }

    const roleNames = userRoles.map(ur => ur.role?.slug || ur.roleId);

    // 6. Générer les tokens
    const tokens = await this.tokenService.issueTokenPair(user.id, user.phone, user.cityId);

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email || '',
        first_name: user.firstName,
        last_name: user.lastName,
        phone: user.phone,
        roles: roleNames,
        permissions: permissions,
      },
    };
  }

  async refreshToken(refreshToken: string): Promise<AdminAuthResponse> {
    const tokens = await this.tokenService.refresh(refreshToken);
    
    // On ne peut pas récupérer les infos user ici sans le décoder du token
    // Le client doit garder ces infos en cache
    return {
      ...tokens,
      user: {
        id: '',
        email: '',
        first_name: '',
        last_name: '',
        phone: '',
        roles: [],
        permissions: [],
      },
    };
  }

  async logout(refreshToken: string): Promise<void> {
    await this.tokenService.revoke(refreshToken);
  }

  /**
   * Demande de réinitialisation de mot de passe
   * Génère un token et le stocke dans Redis (1h de validité)
   * En production, enverrait un email avec le lien de reset
   */
  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const user = await this.userRepo.findOne({
      where: { email: dto.email.toLowerCase() },
    });

    // Pour des raisons de sécurité, on retourne toujours un succès
    // même si l'email n'existe pas (évite l'énumération des emails)
    if (!user) {
      this.logger.warn(`Forgot password attempt for unknown email: ${dto.email}`);
      return { message: 'Si cet email existe, un lien de réinitialisation a été envoyé.' };
    }

    // Vérifier que l'user a au moins un rôle admin
    const userRoles = await this.rbacService.getUserRoles(user.id);
    if (userRoles.length === 0) {
      this.logger.warn(`Forgot password attempt for non-admin user: ${dto.email}`);
      return { message: 'Si cet email existe, un lien de réinitialisation a été envoyé.' };
    }

    // Générer un token unique
    const resetToken = uuidv4();
    const tokenKey = `${RESET_TOKEN_PREFIX}${resetToken}`;

    // Stocker le token dans Redis avec TTL de 1h
    await this.redis.setJson(tokenKey, { userId: user.id, email: user.email }, RESET_TOKEN_TTL);

    // En développement, on log le token (en prod, on enverrait un email)
    const resetUrl = `http://localhost:3001/reset-password?token=${resetToken}`;
    this.logger.log(`[DEV] Reset password link for ${user.email}: ${resetUrl}`);
    this.logger.log(`[DEV] Reset token: ${resetToken}`);

    // TODO: En production, envoyer un email avec le lien
    // await this.emailService.sendResetPasswordEmail(user.email, resetUrl);

    return { message: 'Si cet email existe, un lien de réinitialisation a été envoyé.' };
  }

  /**
   * Réinitialisation du mot de passe avec le token
   */
  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const tokenKey = `${RESET_TOKEN_PREFIX}${dto.token}`;
    
    // Récupérer les données du token depuis Redis
    const tokenData = await this.redis.getJson<{ userId: string; email: string }>(tokenKey);

    if (!tokenData) {
      throw new BadRequestException('Token invalide ou expiré');
    }

    // Trouver l'utilisateur
    const user = await this.userRepo.findOne({ where: { id: tokenData.userId } });
    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    // Mettre à jour le mot de passe
    user.passwordHash = await bcrypt.hash(dto.password, 12);
    await this.userRepo.save(user);

    // Supprimer le token (usage unique)
    await this.redis.del(tokenKey);

    // Révoquer tous les refresh tokens existants (déconnexion de tous les appareils)
    await this.tokenService.revokeAll(user.id);

    this.logger.log(`Password reset successful for user: ${user.email}`);

    return { message: 'Mot de passe réinitialisé avec succès. Vous pouvez maintenant vous connecter.' };
  }
}
