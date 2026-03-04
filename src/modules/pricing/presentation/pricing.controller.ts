import {
  Controller, Get, Post, Patch, Body, Param, Request,
  ParseUUIDPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiOkResponse, ApiCreatedResponse, ApiUnauthorizedResponse, ApiForbiddenResponse } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PricingService } from '../application/pricing.service';
import { PricingRuleRegistry } from '../application/registry/pricing-rule.registry';
import { CityPricingConfig } from '../domain/entities/city-pricing-config.entity';
import { PricingServiceType } from '../domain/entities/pricing-rule.entity';
import { EstimatePriceDto, CancellationFeeDto } from './dto/estimate-price.dto';
import { UpsertCityPricingConfigDto, ToggleRuleDto } from './dto/manage-config.dto';
import { Roles } from '../../../shared/decorators/roles.decorator';

@ApiTags('Pricing')
@ApiBearerAuth('access-token')
@Controller({ path: 'pricing', version: '1' })
export class PricingController {
  constructor(
    private readonly pricingService: PricingService,
    private readonly registry: PricingRuleRegistry,
    @InjectRepository(CityPricingConfig)
    private readonly configRepo: Repository<CityPricingConfig>,
  ) {}

  // ── Estimation tarifaire ─────────────────────────────────────────────────

  @Post('estimate')
  @ApiOperation({
    summary: 'Estimer le prix d\'un trajet',
    description:
      'Calcule le tarif en fonction des règles actives pour la ville de l\'utilisateur.\n\n' +
      'Les règles consultées incluent : tarif de base, tarification dynamique (heure de pointe), ' +
      'surcharge nuit, majoration passagers multiples.\n\n' +
      'Body : `{ serviceType, distanceKm, durationMinutes, passengersCount?, demandFactor? }`',
  })
  @ApiOkResponse({
    schema: { example: { total: 1850, breakdown: { base: 500, distanceFee: 1200, surcharge: 150 }, currency: 'XOF' } },
  })
  @ApiUnauthorizedResponse()
  estimate(
    @Request() req: { user: { cityId: string } },
    @Body() dto: EstimatePriceDto,
  ) {
    const now = new Date();
    return this.pricingService.calculate({
      cityId:          req.user.cityId,
      serviceType:     dto.serviceType,
      distanceKm:      dto.distanceKm,
      durationMinutes: dto.durationMinutes,
      hour:            now.getHours(),
      dayOfWeek:       now.getDay() || 7,
      passengersCount: dto.passengersCount,
      demandFactor:    dto.demandFactor,
    });
  }

  @Post('cancellation-fee')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Calculer les frais d\'annulation',
    description:
      'Retourne les frais d\'annulation applicables selon la politique active de la ville.\n\n' +
      'Les frais varient selon :\n' +
      '- Si le chauffeur est déjà en route (`driverEnRoute: true`)\n' +
      '- Si le passager a déjà annulé une course ce jour',
  })
  @ApiOkResponse({
    schema: { example: { cancellationFee: 250, currency: 'XOF', reason: 'driver_en_route' } },
  })
  @ApiUnauthorizedResponse()
  cancellationFee(
    @Request() req: { user: { cityId: string } },
    @Body() dto: CancellationFeeDto,
  ) {
    const now = new Date();
    return this.pricingService.calculate({
      cityId:          req.user.cityId,
      serviceType:     dto.serviceType,
      distanceKm:      0,
      durationMinutes: 0,
      hour:            now.getHours(),
      dayOfWeek:       now.getDay() || 7,
      isCancellation:  true,
    });
  }

  // ── Administration des règles ─────────────────────────────────────────────

  @Get('admin/rules/registered')
  @Roles('admin')
  @ApiOperation({ summary: 'Lister les handlers de règles enregistrés en mémoire' })
  listRegisteredHandlers() {
    return { handlers: this.registry.listKeys() };
  }

  @Get('admin/configs/:cityId/:serviceType')
  @Roles('admin')
  @ApiOperation({ summary: 'Lister les configs de tarification d\'une ville' })
  @ApiParam({ name: 'serviceType', enum: PricingServiceType })
  listCityConfigs(
    @Param('cityId', ParseUUIDPipe) cityId: string,
    @Param('serviceType') serviceType: PricingServiceType,
  ) {
    return this.configRepo.find({
      where: { cityId, serviceType },
      order: { priority: 'ASC' },
    });
  }

  @Post('admin/configs')
  @Roles('admin')
  @ApiOperation({ summary: 'Créer ou mettre à jour une config de règle pour une ville' })
  async upsertConfig(@Body() dto: UpsertCityPricingConfigDto) {
    // Recherche d'un enregistrement existant (cityId + serviceType + ruleKey)
    let config = await this.configRepo.findOne({
      where: {
        cityId:      dto.cityId,
        serviceType: dto.serviceType,
        ruleKey:     dto.ruleKey,
      },
    });

    if (config) {
      Object.assign(config, {
        name:       dto.name,
        params:     dto.params,
        conditions: dto.conditions ?? null,
        priority:   dto.priority ?? config.priority,
        isActive:   dto.isActive ?? config.isActive,
      });
    } else {
      config = this.configRepo.create({
        cityId:      dto.cityId,
        serviceType: dto.serviceType,
        ruleKey:     dto.ruleKey,
        name:        dto.name,
        params:      dto.params,
        conditions:  dto.conditions as CityPricingConfig['conditions'] ?? null,
        priority:    dto.priority ?? 10,
        isActive:    dto.isActive ?? true,
      });
    }

    return this.configRepo.save(config);
  }

  @Patch('admin/configs/:id/toggle')
  @Roles('admin')
  @ApiOperation({ summary: 'Activer / désactiver une règle sans modifier ses paramètres' })
  async toggleConfig(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ToggleRuleDto,
  ) {
    await this.configRepo.update(id, { isActive: dto.isActive });
    return this.configRepo.findOneByOrFail({ id });
  }
}

