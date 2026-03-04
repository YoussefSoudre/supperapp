import {
  Controller, Get, Post, Patch, Body, Param,
  Request, ParseUUIDPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiOkResponse, ApiCreatedResponse, ApiParam, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReferralService } from '../application/referral.service';
import { ReferralProgram } from '../domain/entities/referral-program.entity';
import { ReferralUsage, ReferralUsageStatus } from '../domain/entities/referral-usage.entity';
import { CreateReferralProgramDto, ToggleProgramDto } from './dto/create-program.dto';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { IsNull } from 'typeorm';

@ApiTags('Referral')
@ApiBearerAuth('access-token')
@Controller({ path: 'referral', version: '1' })
export class ReferralController {
  constructor(
    private readonly referralService: ReferralService,
    @InjectRepository(ReferralProgram)
    private readonly programRepo: Repository<ReferralProgram>,
    @InjectRepository(ReferralUsage)
    private readonly usageRepo: Repository<ReferralUsage>,
  ) {}

  // ── Endpoints publics utilisateur ────────────────────────────────────────

  @Get('my-code')
  @ApiOperation({
    summary: 'Mon code de parrainage + statistiques',
    description: 'Retourne le code unique de l\'utilisateur, le nombre de filleuls actifs, les récompenses gagnées et le programme en cours.'
  })
  @ApiOkResponse({ schema: { example: { code: 'REF-OUAGA-1234', referrals: 5, rewards: 25000, program: { name: 'Promo lancement', currency: 'XOF' } } } })
  @ApiUnauthorizedResponse()
  getMyStats(@Request() req: { user: { id: string } }) {
    return this.referralService.getReferralStats(req.user.id);
  }

  @Get('my-referrals')
  @ApiOperation({
    summary: 'Mes filleuls (parrainage entrant)',
    description: 'Liste les utilisateurs que vous avez parrainsés, avec leur statut et le nombre de courses effectuées.'
  })
  @ApiOkResponse({ schema: { example: { data: [], total: 5 } } })
  @ApiUnauthorizedResponse()
  async getMyReferrals(@Request() req: { user: { id: string } }) {
    const usages = await this.usageRepo.find({
      where:  { referrerId: req.user.id },
      order:  { createdAt: 'DESC' },
      select: ['id', 'refereeId', 'status', 'tripsCompleted', 'triggerServiceType', 'rewardedAt', 'createdAt'],
    });
    return { data: usages, total: usages.length };
  }

  // ── Programmes actifs (lecture publique) ──────────────────────────────────

  @Get('programs')
  @ApiOperation({
    summary: 'Programmes actifs pour la ville de l\'utilisateur',
    description: 'Retourne les programmes de parrainage actifs applicables (régionaux ou globaux) avec conditions de récompense.'
  })
  @ApiOkResponse({ schema: { example: { data: [{ name: 'Promo Ramadan', referrerRewardAmount: 1000, triggerAfterTrips: 3 }] } } })
  @ApiUnauthorizedResponse()
  async getActivePrograms(@Request() req: { user: { cityId: string } }) {
    const programs = await this.programRepo.find({
      where: [
        { cityId: req.user.cityId, isActive: true },
        { cityId: IsNull() as any, isActive: true },
      ],
      order: { createdAt: 'DESC' },
      select: [
        'id', 'name', 'cityId', 'serviceTypes',
        'referrerRewardType', 'referrerRewardAmount',
        'refereeRewardType', 'refereeRewardAmount',
        'triggerAfterTrips', 'expiresAt',
      ],
    });
    return { data: programs };
  }

  // ── Admin — ROI & tracking ─────────────────────────────────────────────────

  @Get('admin/roi/:cityId')
  @Roles('admin')
  @ApiOperation({ summary: 'Statistiques ROI parrainage par ville' })
  getCityRoi(@Param('cityId', ParseUUIDPipe) cityId: string) {
    return this.referralService.getCityRoi(cityId);
  }

  @Get('admin/usages')
  @Roles('admin')
  @ApiOperation({ summary: 'Lister tous les usages de parrainage (admin)' })
  async getAllUsages() {
    const [data, total] = await this.usageRepo.findAndCount({
      order: { createdAt: 'DESC' },
      take: 100,
    });
    return { data, total };
  }

  // ── Admin — Gestion programmes ─────────────────────────────────────────────

  @Post('admin/programs')
  @Roles('admin')
  @ApiOperation({ summary: 'Créer un programme de parrainage' })
  async createProgram(@Body() dto: CreateReferralProgramDto) {
    const program = this.programRepo.create({
      name:                  dto.name,
      cityId:                dto.cityId ?? null,
      serviceTypes:          dto.serviceTypes,
      referrerRewardType:    dto.referrerRewardType,
      referrerRewardAmount:  dto.referrerRewardAmount,
      maxRewardsPerReferrer: dto.maxRewardsPerReferrer ?? 0,
      refereeRewardType:     dto.refereeRewardType,
      refereeRewardAmount:   dto.refereeRewardAmount,
      triggerAfterTrips:     dto.triggerAfterTrips ?? 1,
      minTriggerAmountXof:   dto.minTriggerAmountXof ?? 0,
      antiAbuseConfig:       (dto.antiAbuseConfig as any) ?? {
        maxFilleulsPerReferrer: 50,
        minAccountAgeDays:      0,
        minTriggerAmountXof:    300,
        maxUsersPerSubnet:      5,
        blockSameDevice:        true,
        pendingExpiryDays:      90,
      },
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      isActive:  dto.isActive ?? true,
    });
    return this.programRepo.save(program);
  }

  @Patch('admin/programs/:id/toggle')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activer / désactiver un programme sans le supprimer' })
  async toggleProgram(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ToggleProgramDto,
  ) {
    await this.programRepo.update(id, { isActive: dto.isActive });
    return this.programRepo.findOneByOrFail({ id });
  }

  @Get('admin/programs')
  @Roles('admin')
  @ApiOperation({ summary: 'Lister tous les programmes (actifs + inactifs)' })
  async getAllPrograms() {
    const [data, total] = await this.programRepo.findAndCount({
      order: { createdAt: 'DESC' },
    });
    return { data, total };
  }
}

