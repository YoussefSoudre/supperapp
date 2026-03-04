import { Injectable, OnModuleInit } from '@nestjs/common';
import { IPricingRuleHandler, RichPricingContext } from '../../domain/interfaces/pricing-rule-handler.interface';
import { PriceBreakdownBuilder } from '../../domain/value-objects/price-breakdown.builder';
import { CityPricingConfig } from '../../domain/entities/city-pricing-config.entity';
import { RULE_KEYS } from '../../domain/constants/rule-keys.constants';
import { PricingRuleRegistry } from '../registry/pricing-rule.registry';

/**
 * PlatformCommissionRule — Prélèvement plateforme sur le montant total.
 *
 * La commission est calculée APRÈS surge et réductions (sur le total final).
 * Doit avoir une priorité élevée (ex: 90) pour s'exécuter en dernier dans le pipeline.
 *
 * params attendus :
 * {
 *   rate: number,      // taux de commission (ex: 0.15 = 15%)
 *   minAmount?: number // commission minimum (ex: 100 XOF)
 * }
 */
@Injectable()
export class PlatformCommissionRule implements IPricingRuleHandler, OnModuleInit {
  readonly key = RULE_KEYS.PLATFORM_COMMISSION;

  constructor(private readonly registry: PricingRuleRegistry) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  apply(
    _context: RichPricingContext,
    builder: PriceBreakdownBuilder,
    config: CityPricingConfig,
  ): void {
    const p = config.params as { rate: number; minAmount?: number };
    const rate = Math.min(Math.max(Number(p.rate ?? 0), 0), 1);
    builder.setCommissionRate(rate);
  }
}
