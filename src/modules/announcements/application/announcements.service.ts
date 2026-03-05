import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AnnouncementScope,
  AnnouncementStatus,
  AnnouncementType,
  SystemAnnouncement,
} from '../domain/entities/announcement.entity';
import { AnnouncementRead } from '../domain/entities/announcement-read.entity';
import {
  AnnouncementAuditLog,
  AnnouncementAuditAction,
} from '../domain/entities/announcement-audit-log.entity';
import { BroadcastService } from '../../notifications/application/broadcast.service';
import { NotificationCategory, NotificationChannel } from '../../notifications/domain/entities/notification.entity';
import { CreateAnnouncementDto, UpdateAnnouncementDto, AnnouncementFilterDto } from '../presentation/dto/announcement.dto';

export interface PaginatedAnnouncements {
  data:       SystemAnnouncement[];
  total:      number;
  page:       number;
  limit:      number;
  totalPages: number;
  nextCursor: string | null;
}

export interface AdminContext {
  id:      string;
  role:    string;
  cityId?: string;
}

/**
 * AnnouncementsService v2
 * ─────────────────────
 * Améliorations v2 :
 *   ✅ Publication planifiée (scheduledAt)
 *   ✅ Restriction admin ville (city_admin)
 *   ✅ Read receipts
 *   ✅ Audit trail
 *   ✅ Soft delete
 *   ✅ Duplicate / Republier
 *   ✅ Estimation d’audience
 *   ✅ Pagination cursor-based
 */
@Injectable()
export class AnnouncementsService {
  private readonly logger = new Logger(AnnouncementsService.name);

  constructor(
    @InjectRepository(SystemAnnouncement)
    private readonly repo: Repository<SystemAnnouncement>,

    @InjectRepository(AnnouncementRead)
    private readonly readRepo: Repository<AnnouncementRead>,

    @InjectRepository(AnnouncementAuditLog)
    private readonly auditRepo: Repository<AnnouncementAuditLog>,

    private readonly broadcastService: BroadcastService,
  ) {}

  // ─── Admin : création ──────────────────────────────────────────────────────

  async create(
    admin: AdminContext,
    dto: CreateAnnouncementDto,
  ): Promise<SystemAnnouncement> {
    this.assertCityScopeConsistency(dto.scope, dto.cityId);
    this.assertAdminCityAccess(admin, dto.scope, dto.cityId);

    const scheduledAt = dto.scheduledAt ? new Date(dto.scheduledAt) : null;
    if (scheduledAt && scheduledAt <= new Date()) {
      throw new BadRequestException('`scheduledAt` doit être dans le futur.');
    }

    const announcement = this.repo.create({
      createdBy:         admin.id,
      title:             dto.title,
      content:           dto.content,
      shortDescription:  dto.shortDescription  ?? null,
      type:              dto.type              ?? AnnouncementType.INFO,
      status:            scheduledAt ? AnnouncementStatus.SCHEDULED : AnnouncementStatus.DRAFT,
      scope:             dto.scope,
      cityId:            dto.scope === AnnouncementScope.CITY ? (dto.cityId ?? null) : null,
      targetRoles:       dto.targetRoles       ?? null,
      channels:          dto.channels ?? [
        NotificationChannel.PUSH,
        NotificationChannel.IN_APP,
        NotificationChannel.WEBSOCKET,
      ],
      pinned:            dto.pinned            ?? false,
      actionUrl:         dto.actionUrl         ?? null,
      mediaUrl:          dto.mediaUrl          ?? null,
      mediaType:         dto.mediaType         ?? null,
      mediaThumbnailUrl: dto.mediaThumbnailUrl ?? null,
      expiresAt:         dto.expiresAt  ? new Date(dto.expiresAt)  : null,
      scheduledAt,
      metadata:          null,
      publishedAt:       null,
      broadcastId:       null,
    });

    const saved = await this.repo.save(announcement);
    await this.writeAudit(saved.id, admin.id, AnnouncementAuditAction.CREATED, {
      scope: saved.scope, type: saved.type, scheduledAt: saved.scheduledAt,
    });
    return saved;
  }

  // ─── Admin : modification (brouillon uniquement) ──────────────────────────

  async update(
    id: string,
    admin: AdminContext,
    dto: UpdateAnnouncementDto,
  ): Promise<SystemAnnouncement> {
    const announcement = await this.findOneOrFail(id);

    if (announcement.status === AnnouncementStatus.ARCHIVED) {
      throw new BadRequestException('Impossible de modifier une annonce archivée.');
    }

    const targetScope  = dto.scope  ?? announcement.scope;
    const targetCityId = dto.cityId ?? (announcement.scope === AnnouncementScope.CITY ? announcement.cityId ?? undefined : undefined);

    if (dto.scope !== undefined) this.assertCityScopeConsistency(dto.scope, targetCityId);
    this.assertAdminCityAccess(admin, targetScope, targetCityId);

    const scheduledAt = dto.scheduledAt ? new Date(dto.scheduledAt) : announcement.scheduledAt;
    if (dto.scheduledAt && scheduledAt && scheduledAt <= new Date()) {
      throw new BadRequestException('`scheduledAt` doit être dans le futur.');
    }

    Object.assign(announcement, {
      title:             dto.title             ?? announcement.title,
      content:           dto.content           ?? announcement.content,
      shortDescription:  dto.shortDescription  ?? announcement.shortDescription,
      type:              dto.type              ?? announcement.type,
      scope:             dto.scope             ?? announcement.scope,
      cityId:            dto.scope === AnnouncementScope.GLOBAL ? null : (dto.cityId ?? announcement.cityId),
      targetRoles:       dto.targetRoles       ?? announcement.targetRoles,
      channels:          dto.channels          ?? announcement.channels,
      pinned:            dto.pinned            ?? announcement.pinned,
      actionUrl:         dto.actionUrl         ?? announcement.actionUrl,
      mediaUrl:          dto.mediaUrl          ?? announcement.mediaUrl,
      mediaType:         dto.mediaType         ?? announcement.mediaType,
      mediaThumbnailUrl: dto.mediaThumbnailUrl ?? announcement.mediaThumbnailUrl,
      expiresAt:         dto.expiresAt   ? new Date(dto.expiresAt)   : announcement.expiresAt,
      scheduledAt,
    });

    if (dto.scheduledAt && announcement.status === AnnouncementStatus.DRAFT) {
      announcement.status = AnnouncementStatus.SCHEDULED;
    }

    const saved = await this.repo.save(announcement);
    await this.writeAudit(saved.id, admin.id, AnnouncementAuditAction.UPDATED, {
      changes: Object.keys(dto).filter(k => (dto as any)[k] !== undefined),
    });
    return saved;
  }

  // ─── Admin : publication ──────────────────────────────────────────────────

  /**
   * Publie une annonce DRAFT → PUBLISHED.
   * Déclenche automatiquement un broadcast BullMQ multi-canal.
   */
  async publish(id: string, admin: AdminContext): Promise<SystemAnnouncement> {
    const announcement = await this.findOneOrFail(id);
    if (
      announcement.status !== AnnouncementStatus.DRAFT &&
      announcement.status !== AnnouncementStatus.SCHEDULED
    ) {
      throw new BadRequestException(
        `L'annonce est déjà ${announcement.status} — seules DRAFT/SCHEDULED peuvent être publiées.`,
      );
    }
    this.assertAdminCityAccess(admin, announcement.scope, announcement.cityId ?? undefined);
    return this.doBroadcastAndPublish(announcement, admin.id);
  }

  async schedule(id: string, admin: AdminContext, scheduledAt: Date): Promise<SystemAnnouncement> {
    if (scheduledAt <= new Date()) {
      throw new BadRequestException('`scheduledAt` doit être dans le futur.');
    }
    const announcement = await this.findOneOrFail(id);
    if (
      announcement.status !== AnnouncementStatus.DRAFT &&
      announcement.status !== AnnouncementStatus.SCHEDULED
    ) {
      throw new BadRequestException(`Impossible de planifier une annonce ${announcement.status}.`);
    }
    this.assertAdminCityAccess(admin, announcement.scope, announcement.cityId ?? undefined);
    announcement.scheduledAt = scheduledAt;
    announcement.status      = AnnouncementStatus.SCHEDULED;
    const saved = await this.repo.save(announcement);
    await this.writeAudit(saved.id, admin.id, AnnouncementAuditAction.SCHEDULED, {
      scheduledAt: scheduledAt.toISOString(),
    });
    return saved;
  }

  // ─── Admin : archivage ────────────────────────────────────────────────────

  async archive(id: string, adminId?: string): Promise<SystemAnnouncement> {
    const announcement = await this.findOneOrFail(id);
    if (announcement.status === AnnouncementStatus.ARCHIVED) {
      throw new BadRequestException('Déjà archivée.');
    }
    announcement.status = AnnouncementStatus.ARCHIVED;
    const saved = await this.repo.save(announcement);
    await this.writeAudit(saved.id, adminId ?? null, AnnouncementAuditAction.ARCHIVED, {});
    return saved;
  }

  async republish(id: string, admin: AdminContext): Promise<SystemAnnouncement> {
    const announcement = await this.findOneOrFail(id);
    if (announcement.status !== AnnouncementStatus.ARCHIVED) {
      throw new BadRequestException(
        `Seules les annonces ARCHIVED peuvent être republiées. Statut actuel : ${announcement.status}`,
      );
    }
    this.assertAdminCityAccess(admin, announcement.scope, announcement.cityId ?? undefined);
    announcement.status      = AnnouncementStatus.DRAFT;
    announcement.publishedAt = null;
    announcement.broadcastId = null;
    announcement.scheduledAt = null;
    const saved = await this.repo.save(announcement);
    await this.writeAudit(saved.id, admin.id, AnnouncementAuditAction.REPUBLISHED, {});
    return saved;
  }

  async duplicate(id: string, admin: AdminContext): Promise<SystemAnnouncement> {
    const source = await this.findOneOrFail(id);
    this.assertAdminCityAccess(admin, source.scope, source.cityId ?? undefined);
    const clone = this.repo.create({
      createdBy:         admin.id,
      title:             `[Copie] ${source.title}`,
      content:           source.content,
      shortDescription:  source.shortDescription,
      type:              source.type,
      status:            AnnouncementStatus.DRAFT,
      scope:             source.scope,
      cityId:            source.cityId,
      targetRoles:       source.targetRoles,
      channels:          source.channels,
      pinned:            false,
      actionUrl:         source.actionUrl,
      mediaUrl:          source.mediaUrl,
      mediaType:         source.mediaType,
      mediaThumbnailUrl: source.mediaThumbnailUrl,
      expiresAt:         null,
      scheduledAt:       null,
      metadata:          source.metadata,
      publishedAt:       null,
      broadcastId:       null,
    });
    const saved = await this.repo.save(clone);
    await this.writeAudit(saved.id, admin.id, AnnouncementAuditAction.DUPLICATED, { sourceId: id });
    return saved;
  }

  // ─── Admin : suppression (brouillon uniquement) ───────────────────────────

  async remove(id: string, adminId: string): Promise<void> {
    const announcement = await this.findOneOrFail(id);
    if (announcement.status === AnnouncementStatus.PUBLISHED) {
      throw new BadRequestException(
        'Impossible de supprimer une annonce publiée — archivez-la d\'abord.',
      );
    }
    await this.writeAudit(id, adminId, AnnouncementAuditAction.DELETED, { title: announcement.title });
    await this.repo.softRemove(announcement);
  }

  // ─── Admin : liste avec filtres ───────────────────────────────────────────

  async findAll(filters: AnnouncementFilterDto): Promise<PaginatedAnnouncements> {
    const { page = 1, limit = 20, status, scope, cityId, type, cursor } = filters;

    const qb = this.repo
      .createQueryBuilder('a')
      .orderBy('a.pinned', 'DESC')
      .addOrderBy('a.published_at', 'DESC')
      .addOrderBy('a.id', 'DESC')
      .take(limit);

    if (status)  qb.andWhere('a.status = :status', { status });
    if (scope)   qb.andWhere('a.scope = :scope', { scope });
    if (cityId)  qb.andWhere('a.city_id = :cityId', { cityId });
    if (type)    qb.andWhere('a.type = :type', { type });

    if (cursor) {
      const ref = await this.repo.findOneBy({ id: cursor });
      if (!ref) throw new BadRequestException(`Cursor invalide: ${cursor}`);
      qb.andWhere(
        '(a.published_at < :refDate OR (a.published_at = :refDate AND a.id < :refId))',
        { refDate: ref.publishedAt ?? new Date(0), refId: ref.id },
      );
    } else {
      qb.skip((page - 1) * limit);
    }

    const [data, total] = await qb.getManyAndCount();
    const nextCursor = data.length === limit ? data[data.length - 1].id : null;

    return {
      data,
      total,
      page:       cursor ? 0 : page,
      limit,
      totalPages: cursor ? 0 : Math.ceil(total / limit),
      nextCursor,
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
        { global: AnnouncementScope.GLOBAL, city: AnnouncementScope.CITY, cityId: userCityId },
      )
      .orderBy('a.pinned', 'DESC')
      .addOrderBy('a.published_at', 'DESC')
      .take(limit)
      .skip(skip)
      .getManyAndCount();

    return { data, total, page, limit, totalPages: Math.ceil(total / limit), nextCursor: null };
  }

  async findOne(id: string): Promise<SystemAnnouncement> {
    return this.findOneOrFail(id);
  }

  // ─── Read receipts ────────────────────────────────────────────────────────

  /** Marque une annonce comme lue. Idempotent. */
  async markAsRead(userId: string, announcementId: string): Promise<void> {
    await this.findOneOrFail(announcementId);
    const existing = await this.readRepo.findOneBy({ userId, announcementId });
    if (existing) return;
    await this.readRepo.save(this.readRepo.create({ userId, announcementId }));
  }

  async getReadCount(announcementId: string): Promise<{ announcementId: string; readCount: number }> {
    const readCount = await this.readRepo.countBy({ announcementId });
    return { announcementId, readCount };
  }

  async getReadIds(userId: string, announcementIds: string[]): Promise<string[]> {
    if (announcementIds.length === 0) return [];
    const reads = await this.readRepo
      .createQueryBuilder('r')
      .select('r.announcement_id', 'announcementId')
      .where('r.user_id = :userId', { userId })
      .andWhere('r.announcement_id IN (:...ids)', { ids: announcementIds })
      .getRawMany<{ announcementId: string }>();
    return reads.map(r => r.announcementId);
  }

  // ─── Estimation d'audience ────────────────────────────────────────────────

  async estimateAudience(id: string): Promise<{
    estimatedUsers: number;
    scope: string;
    cityId: string | null;
    targetRoles: string[] | null;
  }> {
    const announcement = await this.findOneOrFail(id);
    const qb = this.repo.manager
      .createQueryBuilder()
      .select('COUNT(*)', 'count')
      .from('users', 'u')
      .where('u.is_active = true');

    if (announcement.scope === AnnouncementScope.CITY && announcement.cityId) {
      qb.andWhere('u.city_id = :cityId', { cityId: announcement.cityId });
    }
    if (announcement.targetRoles && announcement.targetRoles.length > 0) {
      qb.andWhere('u.role IN (:...roles)', { roles: announcement.targetRoles });
    }

    const raw = await qb.getRawOne<{ count: string }>();
    return {
      estimatedUsers: parseInt(raw?.count ?? '0', 10),
      scope:          announcement.scope,
      cityId:         announcement.cityId,
      targetRoles:    announcement.targetRoles,
    };
  }

  // ─── Audit log ────────────────────────────────────────────────────────────

  async getAuditLog(announcementId: string): Promise<AnnouncementAuditLog[]> {
    await this.findOneOrFail(announcementId);
    return this.auditRepo.find({ where: { announcementId }, order: { createdAt: 'ASC' } });
  }

  // ─── Cron : publication planifiée ────────────────────────────────────────

  async publishScheduled(): Promise<number> {
    const now = new Date();
    const due = await this.repo.find({ where: { status: AnnouncementStatus.SCHEDULED } });
    const toPublish = due.filter(a => a.scheduledAt && a.scheduledAt <= now);
    let published = 0;
    for (const announcement of toPublish) {
      try {
        await this.doBroadcastAndPublish(announcement, null);
        published++;
      } catch (err) {
        this.logger.error(`Failed to auto-publish announcement ${announcement.id}`, err);
      }
    }
    if (published > 0) this.logger.log(`Auto-published ${published} scheduled announcement(s)`);
    return published;
  }

  // ─── Cron : expiration automatique ───────────────────────────────────────

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
    if (affected > 0) this.logger.log(`Auto-archived ${affected} expired announcement(s)`);
    return affected;
  }

  // ─── Privé : broadcast + publication ─────────────────────────────────────

  private async doBroadcastAndPublish(
    announcement: SystemAnnouncement,
    adminId: string | null,
  ): Promise<SystemAnnouncement> {
    const broadcastId = await this.broadcastService.send({
      createdBy:    adminId ?? announcement.createdBy,
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
    announcement.publishedAt = new Date();
    announcement.broadcastId = broadcastId;
    const saved = await this.repo.save(announcement);

    await this.writeAudit(saved.id, adminId, AnnouncementAuditAction.PUBLISHED, {
      broadcastId,
      channels: announcement.channels,
      auto:     adminId === null,
    });

    this.logger.log(
      `Announcement ${saved.id} published${adminId ? ` by ${adminId}` : ' (auto)'} ` +
      `· scope=${announcement.scope} · city=${announcement.cityId ?? 'all'}`,
    );
    return saved;
  }

  // ─── Helpers privés ───────────────────────────────────────────────────────

  private async findOneOrFail(id: string): Promise<SystemAnnouncement> {
    const a = await this.repo.findOneBy({ id });
    if (!a) throw new NotFoundException(`Announcement ${id} not found`);
    return a;
  }

  private async writeAudit(
    announcementId: string,
    adminId: string | null,
    action: AnnouncementAuditAction,
    meta: Record<string, unknown> = {},
  ): Promise<void> {
    try {
      await this.auditRepo.save(
        this.auditRepo.create({ announcementId, adminId, action, meta }),
      );
    } catch (err) {
      this.logger.warn(`Audit log failed for ${announcementId} / ${action}`, err);
    }
  }

  private assertCityScopeConsistency(scope: AnnouncementScope, cityId?: string | null): void {
    if (scope === AnnouncementScope.CITY && !cityId) {
      throw new BadRequestException('`cityId` est requis quand scope = `city`.');
    }
    if (scope === AnnouncementScope.GLOBAL && cityId) {
      throw new BadRequestException('`cityId` doit être null quand scope = `global`.');
    }
  }

  private assertAdminCityAccess(
    admin: AdminContext,
    scope: AnnouncementScope,
    cityId?: string | null,
  ): void {
    if (admin.role !== 'city_admin') return;
    if (scope === AnnouncementScope.GLOBAL) {
      throw new ForbiddenException('Un city_admin ne peut pas gérer une annonce globale.');
    }
    if (cityId && admin.cityId && cityId !== admin.cityId) {
      throw new ForbiddenException(
        `Un city_admin ne peut agir que sur sa propre ville (cityId=${admin.cityId}).`,
      );
    }
  }

  private resolveCategory(type: AnnouncementType): NotificationCategory {
    switch (type) {
      case AnnouncementType.PROMOTION:  return NotificationCategory.PROMO;
      case AnnouncementType.MAINTENANCE:
      case AnnouncementType.UPDATE:
      case AnnouncementType.ALERT:
      case AnnouncementType.INFO:
      default:                          return NotificationCategory.SYSTEM;
    }
  }
}
