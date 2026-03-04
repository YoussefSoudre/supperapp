import { Injectable, OnModuleInit } from '@nestjs/common';
import { IPricingRuleHandler, RichPricingContext } from '../../domain/interfaces/pricing-rule-handler.interface';
import { PriceBreakdownBuilder } from '../../domain/value-objects/price-breakdown.builder';
import { CityPricingConfig } from '../../domain/entities/city-pricing-config.entity';
import { RULE_KEYS } from '../../domain/constants/rule-keys.constants';
import { PricingRuleRegistry } from '../registry/pricing-rule.registry';

interface PeakWindow {
  start: number;  // heure (0-23)
  end: number;
}

/**
 * DynamicSurgeRule — Surge automatique basé sur des créneaux de pointe
 *                    ET/OU un facteur de demande temps-réel.
 *
 * Deux mécanismes combinables :
 *   1. Surge horaire (peakHours)  : fixe un multiplicateur selon l'heure.
 *   2. Surge demande (demandFactor dans PricingContext) : monte linéairement
 *      jusqu'à un plafond si le ratio demande/offre dépasse un seuil.
 *
 * Le multiplicateur final = max(peakMultiplier, demandMultiplier).
 *
 * params attendus :
 * {
 *   peakHours?          : Array<{ start: number, end: number }>,
 *   peakMultiplier?     : number,   // ex: 1.4
 *   demandThreshold?    : number,   // ratio à partir duquel la demande surge (ex: 1.2)
 *   demandMultiplierMax?: number,   // plafond surge demande (ex: 2.5)
 * }
 */
@Injectable()
export class DynamicSurgeRule implements IPricingRuleHandler, OnModuleInit {
  readonly key = RULE_KEYS.DYNAMIC_SURGE;

  constructor(private readonly registry: PricingRuleRegistry) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  apply(
    context: RichPricingContext,
    builder: PriceBreakdownBuilder,
    config: CityPricingConfig,
  ): void {
    const p = config.params as {
      peakHours?:           PeakWindow[];
      peakMultiplier?:      number;
      demandThreshold?:     number;
      demandMultiplierMax?: number;
    };

    let multiplier = 1.0;

    // ── 1. Surge horaire ────────────────────────────────────────────────────
    if (p.peakHours?.length && p.peakMultiplier && p.peakMultiplier > 1) {
      const inPeak = p.peakHours.some(w => this.inWindow(context.hour, w));
      if (inPeak) {
        multiplier = Math.max(multiplier, Number(p.peakMultiplier));
      }
    }

    // ── 2. Surge demande temps-réel ─────────────────────────────────────────
    if (context.demandFactor !== undefined && p.demandThreshold && p.demandMultiplierMax) {
      const threshold = Number(p.demandThreshold);
      const maxMult   = Number(p.demandMultiplierMax);
      if (context.demandFactor > threshold) {
        // Interpolation linéaire : threshold → 1.0, threshold+1 → maxMult
        const ratio      = (context.demandFactor - threshold) / threshold;
        const demandMult = 1 + (maxMult - 1) * Math.min(ratio, 1);
        multiplier = Math.max(multiplier, demandMult);
      }
    }

    if (multiplier > 1.0) {
      builder.applySurgeMultiplier(multiplier);
    }
  }

  private inWindow(hour: number, w: PeakWindow): boolean {
    return w.start > w.end
      ? hour >= w.start || hour < w.end   // créneau overnight
      : hour >= w.start && hour < w.end;
  }
}
