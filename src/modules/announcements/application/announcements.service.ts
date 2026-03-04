import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, MoreThanOrEqual, IsNull, Or } from 'typeorm';
import {
  AnnouncementScope,
  AnnouncementStatus,
  AnnouncementType,
  SystemAnnouncement,
} from '../domain/entities/announcement.entity';
import { BroadcastService } from '../../notifications/application/broadcast.service';
import { NotificationCategory, NotificationChannel } from '../../notifications/domain/entities/notification.entity';
import { CreateAnnouncementDto, UpdateAnnouncementDto, AnnouncementFilterDto } from '../presentation/dto/announcement.dto';

export interface PaginatedAnnouncements {
  data:       SystemAnnouncement[];
  total:      number;
  page:       number;
  limit:      number;
  totalPages: number;
}

/**
 * AnnouncementsService
 * ─────────────────────
 * Gère le cycle de vie des annonces système.
 *
 * Publication :
 *   DRAFT → PUBLISHED → déclenche un broadcast BullMQ multi-canal
 *     - push   : notification push FCM vers tous les appareils
 *     - in_app : bannière dans le fil d'annonces de l'app
 *     - websocket : événement temps réel pour les clients connectés
 *
 * Scoping :
 *   global → toutes les villes (targetCityId = null dans BroadcastService)
 *   city   → uniquement la ville indiquée
 */
@Injectable()
export class AnnouncementsService {
  private readonly logger = new Logger(AnnouncementsService.name);

  constructor(
    @InjectRepository(SystemAnnouncement)
    private readonly repo: Repository<SystemAnnouncement>,

    private readonly broadcastService: BroadcastService,
  ) {}

  // ─── Admin : création ──────────────────────────────────────────────────────

  async create(
    adminId: string,
    dto: CreateAnnouncementDto,
  ): Promise<SystemAnnouncement> {
    this.assertCityScopeConsistency(dto.scope, dto.cityId);

    const announcement = this.repo.create({
      createdBy:        adminId,
      title:            dto.title,
      content:          dto.content,
      shortDescription: dto.shortDescription ?? null,
      type:             dto.type ?? AnnouncementType.INFO,
      status:           AnnouncementStatus.DRAFT,
      scope:            dto.scope,
      cityId:           dto.scope === AnnouncementScope.CITY ? (dto.cityId ?? null) : null,
      targetRoles:      dto.targetRoles ?? null,
      channels:         dto.channels ?? [
        NotificationChannel.PUSH,
        NotificationChannel.IN_APP,
        NotificationChannel.WEBSOCKET,
      ],
      pinned:           dto.pinned ?? false,
      actionUrl:        dto.actionUrl ?? null,
      mediaUrl:         dto.mediaUrl          ?? null,
      mediaType:        dto.mediaType         ?? null,
      mediaThumbnailUrl: dto.mediaThumbnailUrl ?? null,
      expiresAt:        dto.expiresAt ? new Date(dto.expiresAt) : null,
      metadata:         null,
      publishedAt:      null,
      broadcastId:      null,
    });

    return this.repo.save(announcement);
  }

  // ─── Admin : modification (brouillon uniquement) ──────────────────────────

  async update(
    id: string,
    adminId: string,
    dto: UpdateAnnouncementDto,
  ): Promise<SystemAnnouncement> {
    const announcement = await this.findOneOrFail(id);

    if (announcement.status === AnnouncementStatus.ARCHIVED) {
      throw new BadRequestException('Cannot edit an archived announcement');
    }

    if (dto.scope !== undefined) {
      this.assertCityScopeConsistency(
        dto.scope,
        dto.cityId ?? (announcement.scope === AnnouncementScope.CITY ? announcement.cityId ?? undefined : undefined),
      );
    }

    Object.assign(announcement, {
      title:            dto.title            ?? announcement.title,
      content:          dto.content          ?? announcement.content,
      shortDescription: dto.shortDescription ?? announcement.shortDescription,
      type:             dto.type             ?? announcement.type,
      scope:            dto.scope            ?? announcement.scope,
      cityId:           dto.scope === AnnouncementScope.GLOBAL
                          ? null
                          : (dto.cityId ?? announcement.cityId),
      targetRoles:      dto.targetRoles      ?? announcement.targetRoles,
      channels:         dto.channels         ?? announcement.channels,
      pinned:            dto.pinned           ?? announcement.pinned,
      actionUrl:         dto.actionUrl        ?? announcement.actionUrl,
      mediaUrl:          dto.mediaUrl          ?? announcement.mediaUrl,
      mediaType:         dto.mediaType         ?? announcement.mediaType,
      mediaThumbnailUrl: dto.mediaThumbnailUrl ?? announcement.mediaThumbnailUrl,
      expiresAt:         dto.expiresAt ? new Date(dto.expiresAt) : announcement.expiresAt,
    });

    return this.repo.save(announcement);
  }

  // ─── Admin : publication ──────────────────────────────────────────────────

  /**
   * Publie une annonce DRAFT → PUBLISHED.
   * Déclenche automatiquement un broadcast BullMQ multi-canal.
   */
  async publish(id: string, adminId: string): Promise<SystemAnnouncement> {
    const announcement = await this.findOneOrFail(id);

    if (announcement.status !== AnnouncementStatus.DRAFT) {
      throw new BadRequestException(
        `Announcement is already ${announcement.status} — only DRAFT announcements can be published`,
      );
    }

    const now = new Date();

    // Déclencher le broadcast (push + in_app + websocket)
    const broadcastId = await this.broadcastService.send({
      createdBy:    adminId,
      targetCityId: announcement.scope === AnnouncementScope.CITY ? announcement.cityId : null,
      targetRole:   announcement.targetRoles?.join(',') ?? null,
      title:        announcement.title,
      body:         announcement.shortDescription ?? announcement.content.substring(0, 100),
      channels:     announcement.channels as NotificationChannel[],
      category:     this.resolveCategory(announcement.type),
      priority:     announcement.type === AnnouncementType.ALERT ? 'critical' as any : 'high' as any,
      data: {
        announcementId: announcement.id,
        type:           announcement.type,
        actionUrl:      announcement.actionUrl ?? undefined,
      },
    });

    announcement.status      = AnnouncementStatus.PUBLISHED;
    announcement.publishedAt = now;
    announcement.broadcastId = broadcastId;

    const saved = await this.repo.save(announcement);

    this.logger.log(
      `Announcement ${id} published by ${adminId} · scope=${announcement.scope} ` +
      `· city=${announcement.cityId ?? 'all'} · broadcastId=${broadcastId}`,
    );

    return saved;
  }

  // ─── Admin : archivage ────────────────────────────────────────────────────

  async archive(id: string): Promise<SystemAnnouncement> {
    const announcement = await this.findOneOrFail(id);

    if (announcement.status === AnnouncementStatus.ARCHIVED) {
      throw new BadRequestException('Already archived');
    }

    announcement.status = AnnouncementStatus.ARCHIVED;
    return this.repo.save(announcement);
  }

  // ─── Admin : suppression (brouillon uniquement) ───────────────────────────

  async remove(id: string): Promise<void> {
    const announcement = await this.findOneOrFail(id);

    if (announcement.status === AnnouncementStatus.PUBLISHED) {
      throw new BadRequestException(
        'Cannot delete a published announcement — archive it first',
      );
    }

    await this.repo.remove(announcement);
  }

  // ─── Admin : liste avec filtres ───────────────────────────────────────────

  async findAll(filters: AnnouncementFilterDto): Promise<PaginatedAnnouncements> {
    const { page = 1, limit = 20, status, scope, cityId, type } = filters;
    const skip = (page - 1) * limit;

    const where: FindOptionsWhere<SystemAnnouncement> = {};
    if (status)  where.status = status;
    if (scope)   where.scope  = scope;
    if (cityId)  where.cityId = cityId;
    if (type)    where.type   = type;

    const [data, total] = await this.repo.findAndCount({
      where,
      order: { pinned: 'DESC', publishedAt: 'DESC', createdAt: 'DESC' },
      take: limit,
      skip,
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ─── Utilisateurs : annonces actives dans leur ville ─────────────────────

  /**
   * Retourne les annonces PUBLISHED visibles pour un utilisateur d'une ville donnée :
   *   - announcements globales (scope = 'global')
   *   - announcements de sa ville (scope = 'city' AND cityId = userCityId)
   * Exclut les annonces expirées.
   */
  async findActiveForCity(userCityId: string, page = 1, limit = 20): Promise<PaginatedAnnouncements> {
    const skip = (page - 1) * limit;
    const now  = new Date();

    const [data, total] = await this.repo
      .createQueryBuilder('a')
      .where('a.status = :status', { status: AnnouncementStatus.PUBLISHED })
      .andWhere('(a.expires_at IS NULL OR a.expires_at > :now)', { now })
      .andWhere(
        '(a.scope = :global OR (a.scope = :city AND a.city_id = :cityId))',
        {
          global: AnnouncementScope.GLOBAL,
          city:   AnnouncementScope.CITY,
          cityId: userCityId,
        },
      )
      .orderBy('a.pinned', 'DESC')
      .addOrderBy('a.published_at', 'DESC')
      .take(limit)
      .skip(skip)
      .getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<SystemAnnouncement> {
    return this.findOneOrFail(id);
  }

  // ─── Admin : expiration automatique (appelé par un cron) ─────────────────

  /**
   * Archive automatiquement les annonces dont `expiresAt` est dépassé.
   * Peut être appelé par un Cron ou un scheduled job.
   */
  async expireOutdated(): Promise<number> {
    const result = await this.repo
      .createQueryBuilder()
      .update(SystemAnnouncement)
      .set({ status: AnnouncementStatus.ARCHIVED })
      .where('status = :status', { status: AnnouncementStatus.PUBLISHED })
      .andWhere('expires_at IS NOT NULL')
      .andWhere('expires_at <= :now', { now: new Date() })
      .execute();

    const affected = result.affected ?? 0;
    if (affected > 0) {
      this.logger.log(`Auto-archived ${affected} expired announcement(s)`);
    }
    return affected;
  }

  // ─── Helpers privés ───────────────────────────────────────────────────────

  private async findOneOrFail(id: string): Promise<SystemAnnouncement> {
    const a = await this.repo.findOneBy({ id });
    if (!a) throw new NotFoundException(`Announcement ${id} not found`);
    return a;
  }

  private assertCityScopeConsistency(
    scope: AnnouncementScope,
    cityId?: string,
  ): void {
    if (scope === AnnouncementScope.CITY && !cityId) {
      throw new BadRequestException(
        '`cityId` is required when scope is `city`',
      );
    }
    if (scope === AnnouncementScope.GLOBAL && cityId) {
      throw new BadRequestException(
        '`cityId` must be null when scope is `global`',
      );
    }
  }

  private resolveCategory(type: AnnouncementType): NotificationCategory {
    switch (type) {
      case AnnouncementType.PROMOTION:   return NotificationCategory.PROMO;
      case AnnouncementType.MAINTENANCE:
      case AnnouncementType.UPDATE:
      case AnnouncementType.ALERT:
      case AnnouncementType.INFO:
      default:                           return NotificationCategory.SYSTEM;
    }
  }
}
