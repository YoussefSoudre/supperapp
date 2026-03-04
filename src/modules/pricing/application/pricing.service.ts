import { Injectable } from '@nestjs/common';
import { PricingPipelineService } from './pricing-pipeline.service';
import { RichPricingContext } from '../domain/interfaces/pricing-rule-handler.interface';
import { PriceBreakdownResult } from '../domain/value-objects/price-breakdown.builder';
import { PricingServiceType } from '../domain/entities/pricing-rule.entity';

/**
 * @deprecated Les champs de PricingContext sont remplacés par RichPricingContext.
 * Conservé pour la compatibilité ascendante (RideModule, DeliveryModule).
 */
export interface PricingContext {
  cityId: string;
  serviceType: PricingServiceType;
  distanceKm: number;
  durationMinutes: number;
  hour: number;        // 0-23
  dayOfWeek: number;   // 1=Lundi … 7=Dimanche
  // Champs optionnels du nouveau moteur
  passengersCount?: number;
  isCancellation?:  boolean;
  demandFactor?:    number;
  weatherCondition?: string;
  eventProximityKm?: number;
}

/** Alias public vers PriceBreakdownResult pour ne pas casser les imports existants. */
export type PricingResult = PriceBreakdownResult;

/**
 * PricingService — Façade publique du moteur de pricing.
 *
 * Les consommateurs (RideModule, DeliveryModule…) n'ont pas à connaître le pipeline.
 * Ils appellent simplement `calculate(ctx)` comme avant.
 */
@Injectable()
export class PricingService {
  constructor(private readonly pipeline: PricingPipelineService) {}

  /**
   * Calcule le prix d'un trajet en passant le contexte dans le pipeline.
   * Compatible avec l'ancien PricingContext (les champs supplémentaires sont optionnels).
   */
  async calculate(ctx: PricingContext): Promise<PricingResult> {
    const richCtx: RichPricingContext = {
      cityId:           ctx.cityId,
      serviceType:      ctx.serviceType,
      distanceKm:       ctx.distanceKm,
      durationMinutes:  ctx.durationMinutes,
      hour:             ctx.hour,
      dayOfWeek:        ctx.dayOfWeek,
      passengersCount:  ctx.passengersCount,
      isCancellation:   ctx.isCancellation,
      demandFactor:     ctx.demandFactor,
      weatherCondition: ctx.weatherCondition,
      eventProximityKm: ctx.eventProximityKm,
    };
    return this.pipeline.execute(richCtx);
  }

  /** Shorthand pour le calcul direct avec un RichPricingContext. */
  async calculateRich(ctx: RichPricingContext): Promise<PricingResult> {
    return this.pipeline.execute(ctx);
  }
}
