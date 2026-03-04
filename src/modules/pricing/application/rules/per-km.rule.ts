import { Injectable, OnModuleInit } from '@nestjs/common';
import { IPricingRuleHandler, RichPricingContext } from '../../domain/interfaces/pricing-rule-handler.interface';
import { PriceBreakdownBuilder } from '../../domain/value-objects/price-breakdown.builder';
import { CityPricingConfig } from '../../domain/entities/city-pricing-config.entity';
import { RULE_KEYS } from '../../domain/constants/rule-keys.constants';
import { PricingRuleRegistry } from '../registry/pricing-rule.registry';

/**
 * PerKmRule — Coût kilométrique.
 *
 * params attendus :
 * {
 *   ratePerKm: number,  // ex: 150 XOF/km
 * }
 */
@Injectable()
export class PerKmRule implements IPricingRuleHandler, OnModuleInit {
  readonly key = RULE_KEYS.PER_KM;

  constructor(private readonly registry: PricingRuleRegistry) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  apply(
    context: RichPricingContext,
    builder: PriceBreakdownBuilder,
    config: CityPricingConfig,
  ): void {
    const p = config.params as { ratePerKm: number };
    builder.addDistanceCost(Number(p.ratePerKm ?? 0) * context.distanceKm);
  }
}
