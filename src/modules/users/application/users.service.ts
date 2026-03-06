import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserStatus } from '../domain/entities/user.entity';
import { UserKyc, UserKycStatus } from '../domain/entities/user-kyc.entity';
import { SubmitUserKycDto } from '../presentation/dto/submit-kyc.dto';
import { ReviewUserKycDto, KycReviewDecision } from '../presentation/dto/review-kyc.dto';
import { EventBusService } from '../../../shared/events/event-bus.service';
import {
  DomainEvents,
  UserKycSubmittedPayload,
  UserKycReviewedPayload,
} from '../../../shared/events/domain-events.constants';
import { PaginatedResult } from '../../../shared/interfaces/repository.interface';

export interface UserFilterParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  status?: UserStatus | UserStatus[];
  cityId?: string;
  phoneVerified?: boolean;
  kycVerified?: boolean;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
    @InjectRepository(UserKyc)
    private readonly kycRepo: Repository<UserKyc>,
    private readonly eventBus: EventBusService,
  ) {}

  async findById(id: string): Promise<User> {
    const user = await this.repo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    await this.repo.update(id, data as any);
    return this.findById(id);
  }

  async updateFcmToken(id: string, fcmToken: string): Promise<void> {
    await this.repo.update(id, { fcmToken });
  }

  /**
   * Liste paginée et filtrée des utilisateurs (usage admin).
   * passwordHash est exclu par la sélection TypeORM (select: false sur la colonne).
   * @param scopedCityIds null = super_admin (aucune restriction), [] ou [id…] = scope ville
   */
  async findAll(
    params: UserFilterParams = {},
    scopedCityIds?: string[] | null,
  ): Promise<PaginatedResult<User>> {
    const {
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      dateFrom,
      dateTo,
      search,
      status,
      cityId,
      phoneVerified,
      kycVerified,
    } = params;

    const ALLOWED_SORT = ['createdAt', 'firstName', 'lastName', 'updatedAt'];
    const safeSort = ALLOWED_SORT.includes(sortBy) ? sortBy : 'createdAt';

    const qb = this.repo.createQueryBuilder('u');

    // ─── Filtres standards ─────────────────────────────────────────────────
    if (dateFrom) qb.andWhere('u.createdAt >= :dateFrom', { dateFrom });
    if (dateTo)   qb.andWhere('u.createdAt <= :dateTo',   { dateTo });
    if (search) {
      qb.andWhere(
        '(u.firstName ILIKE :s OR u.lastName ILIKE :s OR u.email ILIKE :s OR u.phone ILIKE :s)',
        { s: `%${search}%` },
      );
    }

    // ─── Filtres avancés ──────────────────────────────────────────────────
    if (status) {
      const statuses = Array.isArray(status) ? status : [status];
      qb.andWhere('u.status IN (:...statuses)', { statuses });
    }
    if (cityId)                       qb.andWhere('u.cityId = :cityId', { cityId });
    if (phoneVerified !== undefined)  qb.andWhere('u.phoneVerified = :phoneVerified', { phoneVerified });
    if (kycVerified   !== undefined)  qb.andWhere('u.kycVerified = :kycVerified',     { kycVerified });

    // ─── City scope enforcement (city_admin / manager) ───────────────────
    if (scopedCityIds !== null && scopedCityIds !== undefined) {
      if (scopedCityIds.length === 0) {
        return { data: [], total: 0, page, limit, totalPages: 0 };
      }
      qb.andWhere('u.cityId IN (:...scopedCityIds)', { scopedCityIds });
    }

    const skip = (page - 1) * limit;
    const [data, total] = await qb
      .orderBy(`u.${safeSort}`, sortOrder)
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ─── KYC Client ──────────────────────────────────────────────────────────

  /**
   * Soumission ou re-soumission du dossier KYC par le client.
   * Si un dossier rejeté existe déjà, il est réinitialisé en PENDING.
   * Si un dossier est déjà APPROVED, on bloque la re-soumission.
   */
  async submitKyc(userId: string, dto: SubmitUserKycDto): Promise<UserKyc> {
    const existing = await this.kycRepo.findOne({ where: { userId } });

    if (existing?.status === UserKycStatus.APPROVED) {
      throw new ConflictException('KYC already approved. No re-submission needed.');
    }

    const kyc = existing
      ? Object.assign(existing, {
          idCardFrontUrl:  dto.idCardFrontUrl,
          idCardBackUrl:   dto.idCardBackUrl  ?? null,
          selfieUrl:       dto.selfieUrl,
          addressProofUrl: dto.addressProofUrl ?? null,
          status:          UserKycStatus.PENDING,
          rejectionReason: null,
          reviewedBy:      null,
          reviewedAt:      null,
          submittedAt:     new Date(),
        })
      : this.kycRepo.create({
          userId,
          idCardFrontUrl:  dto.idCardFrontUrl,
          idCardBackUrl:   dto.idCardBackUrl  ?? null,
          selfieUrl:       dto.selfieUrl,
          addressProofUrl: dto.addressProofUrl ?? null,
          status:          UserKycStatus.PENDING,
          submittedAt:     new Date(),
        });

    const saved = await this.kycRepo.save(kyc);

    const payload: UserKycSubmittedPayload = {
      version: 1,
      userId,
      kycId: saved.id,
      timestamp: new Date(),
    };
    await this.eventBus.emit(DomainEvents.USER_KYC_SUBMITTED, payload);

    return saved;
  }

  /** Retourne le dossier KYC d'un utilisateur (null si jamais soumis). */
  async getKycStatus(userId: string): Promise<UserKyc | null> {
    return this.kycRepo.findOne({ where: { userId } }) ?? null;
  }

  /**
   * Revue admin : approuve ou rejette le dossier KYC.
   * Met à jour `user.kycVerified` si approuvé.
   */
  async reviewKyc(
    targetUserId: string,
    dto: ReviewUserKycDto,
    adminId: string,
  ): Promise<UserKyc> {
    const kyc = await this.kycRepo.findOne({ where: { userId: targetUserId } });
    if (!kyc) throw new NotFoundException('No KYC submission found for this user');

    if (kyc.status === UserKycStatus.APPROVED) {
      throw new ConflictException('KYC is already approved');
    }

    if (dto.decision === KycReviewDecision.REJECT && !dto.rejectionReason?.trim()) {
      throw new BadRequestException('rejectionReason is required when rejecting a KYC');
    }

    const approved = dto.decision === KycReviewDecision.APPROVE;

    kyc.status          = approved ? UserKycStatus.APPROVED : UserKycStatus.REJECTED;
    kyc.rejectionReason = approved ? null : (dto.rejectionReason ?? null);
    kyc.reviewedBy      = adminId;
    kyc.reviewedAt      = new Date();

    const saved = await this.kycRepo.save(kyc);

    // Mettre à jour le flag kycVerified sur l'utilisateur
    await this.repo.update(targetUserId, { kycVerified: approved });

    const payload: UserKycReviewedPayload = {
      version:    1,
      userId:     targetUserId,
      kycId:      saved.id,
      decision:   approved ? 'approved' : 'rejected',
      rejectionReason: dto.rejectionReason,
      reviewedBy: adminId,
      timestamp:  new Date(),
    };
    await this.eventBus.emit(
      approved ? DomainEvents.USER_KYC_APPROVED : DomainEvents.USER_KYC_REJECTED,
      payload,
    );

    return saved;
  }

  /**
   * Liste paginée des dossiers KYC pour l'admin.
   * Chaque entrée est enrichie avec les infos de l'utilisateur et du relecteur.
   * @param scopedCityIds null = super_admin (aucune restriction), [] ou [id…] = scope ville
   */
  async listKyc(params: {
    page?: number;
    limit?: number;
    status?: UserKycStatus;
    cityId?: string;
    scopedCityIds?: string[] | null;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
    reviewedBy?: string;
  } = {}): Promise<PaginatedResult<Record<string, unknown>>> {
    const {
      page = 1, limit = 20, status, cityId, scopedCityIds,
      dateFrom, dateTo, search, reviewedBy,
    } = params;

    if (scopedCityIds !== null && scopedCityIds !== undefined && scopedCityIds.length === 0) {
      return { data: [], total: 0, page, limit, totalPages: 0 };
    }

    const qb = this.kycRepo
      .createQueryBuilder('k')
      .innerJoin(User, 'u', 'u.id = k.userId')
      .leftJoin(User, 'reviewer', 'reviewer.id = k.reviewedBy')
      .select('k.id', 'kycId')
      .addSelect('k.status', 'status')
      .addSelect('k.submittedAt', 'submittedAt')
      .addSelect('k.reviewedAt', 'reviewedAt')
      .addSelect('k.rejectionReason', 'rejectionReason')
      .addSelect('k.idCardFrontUrl', 'idCardFrontUrl')
      .addSelect('k.idCardBackUrl', 'idCardBackUrl')
      .addSelect('k.selfieUrl', 'selfieUrl')
      .addSelect('k.addressProofUrl', 'addressProofUrl')
      .addSelect('u.id', 'userId')
      .addSelect('u.firstName', 'userFirstName')
      .addSelect('u.lastName', 'userLastName')
      .addSelect('u.phone', 'userPhone')
      .addSelect('u.cityId', 'userCityId')
      .addSelect('reviewer.id', 'reviewerId')
      .addSelect('reviewer.firstName', 'reviewerFirstName')
      .addSelect('reviewer.lastName', 'reviewerLastName');

    if (status)     qb.andWhere('k.status = :status',         { status });
    if (dateFrom)   qb.andWhere('k.submittedAt >= :dateFrom', { dateFrom });
    if (dateTo)     qb.andWhere('k.submittedAt <= :dateTo',   { dateTo });
    if (reviewedBy) qb.andWhere('k.reviewedBy = :reviewedBy', { reviewedBy });
    if (search) {
      qb.andWhere(
        '(u.firstName ILIKE :s OR u.lastName ILIKE :s OR u.phone ILIKE :s)',
        { s: `%${search}%` },
      );
    }
    if (scopedCityIds !== null && scopedCityIds !== undefined) {
      qb.andWhere('u.cityId IN (:...scopedCityIds)', { scopedCityIds });
    }
    if (cityId) qb.andWhere('u.cityId = :cityId', { cityId });

    const total = await qb.getCount();
    const skip  = (page - 1) * limit;
    const data  = await qb
      .orderBy('k.submittedAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getRawMany<Record<string, unknown>>();

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
