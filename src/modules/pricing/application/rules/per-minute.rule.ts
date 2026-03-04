import { Injectable, OnModuleInit } from '@nestjs/common';
import { IPricingRuleHandler, RichPricingContext } from '../../domain/interfaces/pricing-rule-handler.interface';
import { PriceBreakdownBuilder } from '../../domain/value-objects/price-breakdown.builder';
import { CityPricingConfig } from '../../domain/entities/city-pricing-config.entity';
import { RULE_KEYS } from '../../domain/constants/rule-keys.constants';
import { PricingRuleRegistry } from '../registry/pricing-rule.registry';

/**
 * PerMinuteRule — Coût temporel (prix par minute).
 *
 * params attendus :
 * {
 *   ratePerMinute: number,  // ex: 20 XOF/min
 * }
 */
@Injectable()
export class PerMinuteRule implements IPricingRuleHandler, OnModuleInit {
  readonly key = RULE_KEYS.PER_MINUTE;

  constructor(private readonly registry: PricingRuleRegistry) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  apply(
    context: RichPricingContext,
    builder: PriceBreakdownBuilder,
    config: CityPricingConfig,
  ): void {
    const p = config.params as { ratePerMinute: number };
    builder.addTimeCost(Number(p.ratePerMinute ?? 0) * context.durationMinutes);
  }
}
