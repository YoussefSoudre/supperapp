import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../domain/entities/role.entity';
import { Permission } from '../domain/entities/permission.entity';
import { UserRole } from '../domain/entities/user-role.entity';
import { User } from '../../users/domain/entities/user.entity';
import { NotificationsService } from '../../notifications/application/notifications.service';
import { NotificationChannel, NotificationCategory, NotificationPriority } from '../../notifications/domain/entities/notification.entity';
import { SendKycInvitationDto, KycNotificationTarget } from '../presentation/dto/send-kyc-invitation.dto';
import { RbacService } from './rbac.service';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permRepo: Repository<Permission>,
    @InjectRepository(UserRole)
    private readonly userRoleRepo: Repository<UserRole>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly notificationsService: NotificationsService,
    private readonly rbacService: RbacService,
  ) {}

  async getRoles(): Promise<Role[]> {
    return this.roleRepo.find({ where: { isActive: true } });
  }

  async assignRole(
    userId: string,
    roleId: string,
    grantedBy: string,
    cityId?: string,
  ): Promise<UserRole> {
    const existing = await this.userRoleRepo.findOne({ where: { userId, roleId } });
    if (existing) return existing;

    return this.userRoleRepo.save(
      this.userRoleRepo.create({ userId, roleId, grantedBy, cityId: cityId ?? null, expiresAt: null }),
    );
  }

  async getUserRoles(userId: string): Promise<string[]> {
    const userRoles = await this.userRoleRepo
      .createQueryBuilder('ur')
      .innerJoinAndSelect('role', 'r', 'r.id = ur.roleId')
      .where('ur.userId = :userId', { userId })
      .andWhere('(ur.expiresAt IS NULL OR ur.expiresAt > NOW())')
      .getMany();

    return userRoles.map((ur) => ur.roleId);
  }

  /**
   * Envoie une notification d'invitation au KYC.
   *
   * Scoping automatique selon le rôle de l'admin appelant :
   *  - super_admin  → accès libre (toutes villes, all_without_kyc global)
   *  - city_admin   → restreint à ses villes administrées :
   *      · all_without_kyc : limité aux utilisateurs de ses villes
   *      · city            : le cityId doit être l'une de ses villes
   *      · single_user     : l'utilisateur cible doit appartenir à l'une de ses villes
   *
   * @returns Nombre d'utilisateurs notifiés.
   */
  async sendKycInvitation(
    dto: SendKycInvitationDto,
    adminId: string,
  ): Promise<{ notified: number }> {
    const channels = this.resolveChannels(dto.channels);

    // Récupérer les permissions de l'admin pour le scoping
    const perms = await this.rbacService.getEffectivePermissions(adminId);
    const isGlobal = perms.hasGlobalRole;
    const managedCities: string[] = perms.cityScopedRoleIds; // villes administrées

    if (dto.target === KycNotificationTarget.SINGLE_USER) {
      if (!dto.userId) {
        throw new BadRequestException('userId is required when target is single_user');
      }
      // city_admin : vérifier que l'utilisateur cible appartient à une de ses villes
      if (!isGlobal) {
        const targetUser = await this.userRepo.findOne({
          where: { id: dto.userId },
          select: ['id', 'cityId'],
        });
        if (!targetUser || !managedCities.includes(targetUser.cityId)) {
          throw new ForbiddenException(
            'Accès refusé : cet utilisateur ne fait pas partie de vos villes administrées.',
          );
        }
      }
      await this.notifyUser(dto.userId, dto.title, dto.body, channels);
      return { notified: 1 };
    }

    // Construire la requête pour les cibles broadcast
    const qb = this.userRepo
      .createQueryBuilder('u')
      .select(['u.id'])
      .where('u.kycVerified = false');

    if (dto.target === KycNotificationTarget.CITY) {
      if (!dto.cityId) {
        throw new BadRequestException('cityId is required when target is city');
      }
      // city_admin : le cityId demandé doit être dans ses villes
      if (!isGlobal && !managedCities.includes(dto.cityId)) {
        throw new ForbiddenException(
          `Accès refusé : vous n'administrez pas la ville ${dto.cityId}.`,
        );
      }
      qb.andWhere('u.cityId = :cityId', { cityId: dto.cityId });
    } else {
      // target = all_without_kyc
      // city_admin → restreint automatiquement à ses villes (sans lever d'erreur)
      if (!isGlobal) {
        if (managedCities.length === 0) {
          return { notified: 0 };
        }
        qb.andWhere('u.cityId IN (:...cities)', { cities: managedCities });
      }
    }

    const users = await qb.getMany();

    // Envoyer en batches de 500 pour éviter de surcharger la queue
    const BATCH = 500;
    for (let i = 0; i < users.length; i += BATCH) {
      const batch = users.slice(i, i + BATCH);
      await Promise.all(
        batch.map((u) => this.notifyUser(u.id, dto.title, dto.body, channels)),
      );
    }

    return { notified: users.length };
  }

  // ─── Helpers privés ────────────────────────────────────────────────────────

  private async notifyUser(
    userId: string,
    title: string,
    body: string,
    channels: NotificationChannel[],
  ): Promise<void> {
    for (const channel of channels) {
      await this.notificationsService.notify({
        userId,
        channel,
        category: NotificationCategory.SYSTEM,
        priority: NotificationPriority.NORMAL,
        title,
        body,
        data: { screen: 'KycSubmit' },
      });
    }
  }

  private resolveChannels(raw?: string[]): NotificationChannel[] {
    const defaults: NotificationChannel[] = [
      NotificationChannel.PUSH,
      NotificationChannel.IN_APP,
    ];
    if (!raw?.length) return defaults;

    const VALID = Object.values(NotificationChannel) as string[];
    return raw
      .filter((c) => VALID.includes(c))
      .map((c) => c as NotificationChannel);
  }
}
