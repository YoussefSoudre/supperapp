import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { PricingRule } from './domain/entities/pricing-rule.entity';
import { CityPricingConfig } from './domain/entities/city-pricing-config.entity';

// Registry
import { PricingRuleRegistry } from './application/registry/pricing-rule.registry';

// Rule handlers — chaque règle s'auto-enregistre via OnModuleInit
import { BaseFareRule } from './application/rules/base-fare.rule';
import { PerKmRule } from './application/rules/per-km.rule';
import { PerMinuteRule } from './application/rules/per-minute.rule';
import { SurgeRule } from './application/rules/surge.rule';
import { DynamicSurgeRule } from './application/rules/dynamic-surge.rule';
import { CarpoolDiscountRule } from './application/rules/carpool-discount.rule';
import { PlatformCommissionRule } from './application/rules/platform-commission.rule';
import { CancellationFeeRule } from './application/rules/cancellation-fee.rule';

// Services
import { PricingPipelineService } from './application/pricing-pipeline.service';
import { PricingService } from './application/pricing.service';

// Controller
import { PricingController } from './presentation/pricing.controller';

/**
 * PricingModule — Moteur de tarification dynamique configurable.
 *
 * Architecture : Strategy + Registry + Chain of Responsibility (pipeline).
 *
 * Pour ajouter une nouvelle règle (ex: WeatherSurchargeRule) :
 *   1. Créer src/modules/pricing/application/rules/weather-surcharge.rule.ts
 *      implémentant IPricingRuleHandler et OnModuleInit.
 *   2. L'importer ici dans le tableau `providers`.
 *   3. Insérer la config dans la table `city_pricing_configs`.
 *   ➜  ZERO autre modification de code.
 *
 * Règles actives : base_fare | per_km | per_minute | surge | dynamic_surge
 *                 | carpool_discount | platform_commission | cancellation_fee
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      PricingRule,        // conservé pour compatibilité ascendante
      CityPricingConfig,  // nouveau moteur de règles
    ]),
  ],
  controllers: [PricingController],
  providers: [
    // ── Infrastructure ──────────────────────────────────────────────────
    PricingRuleRegistry,

    // ── Règles de base ───────────────────────────────────────────────────
    BaseFareRule,
    PerKmRule,
    PerMinuteRule,

    // ── Surge ────────────────────────────────────────────────────────────
    SurgeRule,
    DynamicSurgeRule,

    // ── Réductions ────────────────────────────────────────────────────────
    CarpoolDiscountRule,

    // ── Frais & commissions ───────────────────────────────────────────────
    PlatformCommissionRule,
    CancellationFeeRule,

    // ── Pipeline & façade ─────────────────────────────────────────────────
    PricingPipelineService,
    PricingService,
  ],
  exports: [PricingService],
})
export class PricingModule {}

