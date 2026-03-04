import { Injectable, OnModuleInit } from '@nestjs/common';
import { IPricingRuleHandler, RichPricingContext } from '../../domain/interfaces/pricing-rule-handler.interface';
import { PriceBreakdownBuilder } from '../../domain/value-objects/price-breakdown.builder';
import { CityPricingConfig } from '../../domain/entities/city-pricing-config.entity';
import { RULE_KEYS } from '../../domain/constants/rule-keys.constants';
import { PricingRuleRegistry } from '../registry/pricing-rule.registry';

/**
 * SurgeRule — Multiplicateur de surge statique, configuré manuellement en DB.
 *
 * Usage : activer cette règle manuellement lors d'un pic prévisible
 *         (ex: Saint-Sylvestre, match de football).
 *
 * params attendus :
 * {
 *   multiplier: number,  // ex: 1.5 (= +50%)
 * }
 *
 * Conditions typiques (CityPricingConfig.conditions) :
 *   { time: { start: "22:00", end: "02:00" }, days: [7] }
 *
 * Note : dynamic_surge et surge sont cumulatifs — le builder prend le max des deux.
 */
@Injectable()
export class SurgeRule implements IPricingRuleHandler, OnModuleInit {
  readonly key = RULE_KEYS.SURGE;

  constructor(private readonly registry: PricingRuleRegistry) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  apply(
    _context: RichPricingContext,
    builder: PriceBreakdownBuilder,
    config: CityPricingConfig,
  ): void {
    const p = config.params as { multiplier: number };
    const multiplier = Number(p.multiplier ?? 1.0);
    if (multiplier > 1.0) {
      builder.applySurgeMultiplier(multiplier);
    }
  }
}
