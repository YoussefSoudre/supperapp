import { Injectable, OnModuleInit } from '@nestjs/common';
import { IPricingRuleHandler, RichPricingContext } from '../../domain/interfaces/pricing-rule-handler.interface';
import { PriceBreakdownBuilder } from '../../domain/value-objects/price-breakdown.builder';
import { CityPricingConfig } from '../../domain/entities/city-pricing-config.entity';
import { RULE_KEYS } from '../../domain/constants/rule-keys.constants';
import { PricingRuleRegistry } from '../registry/pricing-rule.registry';

/**
 * BaseFareRule — Tarif de prise en charge.
 *
 * params attendus dans CityPricingConfig.params :
 * {
 *   amount      : number,  // tarif fixe (ex: 500 XOF)
 *   currency?   : string,  // devise (défaut: XOF)
 *   minimumFare?: number,  // tarif minimum global
 *   maximumFare?: number,  // plafond tarifaire
 * }
 */
@Injectable()
export class BaseFareRule implements IPricingRuleHandler, OnModuleInit {
  readonly key = RULE_KEYS.BASE_FARE;

  constructor(private readonly registry: PricingRuleRegistry) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  apply(
    _context: RichPricingContext,
    builder: PriceBreakdownBuilder,
    config: CityPricingConfig,
  ): void {
    const p = config.params as {
      amount: number;
      currency?: string;
      minimumFare?: number;
      maximumFare?: number;
    };

    builder.setBaseFare(Number(p.amount ?? 0));

    if (p.currency)     builder.setCurrency(p.currency);
    if (p.minimumFare)  builder.setMinimumFare(Number(p.minimumFare));
    if (p.maximumFare)  builder.setMaximumFare(Number(p.maximumFare));
  }
}
