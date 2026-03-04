import { Injectable, OnModuleInit } from '@nestjs/common';
import { IPricingRuleHandler, RichPricingContext } from '../../domain/interfaces/pricing-rule-handler.interface';
import { PriceBreakdownBuilder } from '../../domain/value-objects/price-breakdown.builder';
import { CityPricingConfig } from '../../domain/entities/city-pricing-config.entity';
import { RULE_KEYS } from '../../domain/constants/rule-keys.constants';
import { PricingRuleRegistry } from '../registry/pricing-rule.registry';

/**
 * CarpoolDiscountRule — Réduction covoiturage proportionnelle au nombre de passagers.
 *
 * La règle ne s'applique que si context.passengersCount >= 2.
 * La condition `minPassengers` peut aussi être déclarée dans CityPricingConfig.conditions
 * pour être vérifiée par le pipeline avant même d'appeler apply().
 *
 * Formule : discount = subtotal_avant_surge × discountPerPassenger × (passagersCount - 1)
 *           plafonné à maxDiscountRate du subtotal.
 *
 * params attendus :
 * {
 *   discountPerPassenger: number,  // taux par passager supplémentaire (ex: 0.10 = 10%)
 *   maxDiscountRate?    : number,  // plafond de la réduction totale (ex: 0.40 = 40%)
 *   maxPassengers?      : number,  // maximum pris en compte (défaut: 4)
 * }
 */
@Injectable()
export class CarpoolDiscountRule implements IPricingRuleHandler, OnModuleInit {
  readonly key = RULE_KEYS.CARPOOL_DISCOUNT;

  constructor(private readonly registry: PricingRuleRegistry) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  apply(
    context: RichPricingContext,
    builder: PriceBreakdownBuilder,
    config: CityPricingConfig,
  ): void {
    const passengers = context.passengersCount ?? 1;
    if (passengers < 2) return;

    const p = config.params as {
      discountPerPassenger: number;
      maxDiscountRate?:     number;
      maxPassengers?:       number;
    };

    const maxPassengers      = Number(p.maxPassengers ?? 4);
    const extraPassengers    = Math.min(passengers - 1, maxPassengers - 1);
    const rawDiscountRate    = Number(p.discountPerPassenger ?? 0) * extraPassengers;
    const cappedDiscountRate = Math.min(rawDiscountRate, Number(p.maxDiscountRate ?? 0.40));

    // Calcul de la base (subtotal estimé depuis le builder)
    // Note : on utilise une référence au subtotal courant via un snapshot
    const snapshot   = builder.build();
    const base       = snapshot.subtotal;
    const discountAmt = base * cappedDiscountRate;

    if (discountAmt > 0) {
      builder.addDiscount(
        RULE_KEYS.CARPOOL_DISCOUNT,
        discountAmt,
        `Réduction covoiturage (${passengers} passagers)`,
      );
    }
  }
}
