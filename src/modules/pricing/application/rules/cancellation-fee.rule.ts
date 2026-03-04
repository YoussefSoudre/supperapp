import { Injectable, OnModuleInit } from '@nestjs/common';
import { IPricingRuleHandler, RichPricingContext } from '../../domain/interfaces/pricing-rule-handler.interface';
import { PriceBreakdownBuilder } from '../../domain/value-objects/price-breakdown.builder';
import { CityPricingConfig } from '../../domain/entities/city-pricing-config.entity';
import { RULE_KEYS } from '../../domain/constants/rule-keys.constants';
import { PricingRuleRegistry } from '../registry/pricing-rule.registry';

/**
 * CancellationFeeRule — Frais d'annulation fixes.
 *
 * Ne s'applique que si context.isCancellation === true.
 * Lorsque cette règle est active, elle REMPLACE le calcul normal :
 * elle vide le subtotal et pose un fee fixe.
 *
 * La condition `onlyOnCancellation: true` peut aussi être configurée dans
 * CityPricingConfig.conditions pour que le pipeline l'ignore sur les trajets normaux.
 *
 * params attendus :
 * {
 *   amount    : number,  // montant fixe (ex: 500 XOF)
 *   currency? : string,
 * }
 */
@Injectable()
export class CancellationFeeRule implements IPricingRuleHandler, OnModuleInit {
  readonly key = RULE_KEYS.CANCELLATION_FEE;

  constructor(private readonly registry: PricingRuleRegistry) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  apply(
    context: RichPricingContext,
    builder: PriceBreakdownBuilder,
    config: CityPricingConfig,
  ): void {
    // Garde : la règle ne doit agir qu'en cas d'annulation
    if (!context.isCancellation) return;

    const p = config.params as { amount: number; currency?: string };

    // Réinitialiser les composantes variables (le trajet ne s'est pas effectué)
    builder.setBaseFare(0).addDistanceCost(0).addTimeCost(0);

    if (p.currency) builder.setCurrency(p.currency);

    builder.addFee(
      RULE_KEYS.CANCELLATION_FEE,
      Number(p.amount ?? 0),
      'Frais d\'annulation',
    );
  }
}
