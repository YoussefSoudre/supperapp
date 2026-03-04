import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CityPricingConfig } from '../domain/entities/city-pricing-config.entity';
import { RichPricingContext } from '../domain/interfaces/pricing-rule-handler.interface';
import { PriceBreakdownBuilder, PriceBreakdownResult } from '../domain/value-objects/price-breakdown.builder';
import { RuleConditions } from '../domain/interfaces/rule-conditions.interface';
import { PricingRuleRegistry } from './registry/pricing-rule.registry';

/**
 * PricingPipelineService — Orchestrateur du moteur de pricing dynamique.
 *
 * Algorithme :
 *   1. Charger les CityPricingConfig actives (cityId + serviceType), triées par priority ASC.
 *   2. Pour chaque config, vérifier les conditions (horaire, jour, passagers, annulation…).
 *   3. Résoudre le handler depuis le PricingRuleRegistry.
 *   4. Appeler handler.apply() sur le PriceBreakdownBuilder.
 *   5. Construire et retourner le résultat final.
 *
 * Extension sans modification de code :
 *   • Ajouter une règle → implémenter IPricingRuleHandler + l'enregistrer dans le module.
 *   • Ajouter une condition → ajouter le champ dans RuleConditions + le cas dans matchesConditions().
 */
@Injectable()
export class PricingPipelineService {
  private readonly logger = new Logger(PricingPipelineService.name);

  constructor(
    @InjectRepository(CityPricingConfig)
    private readonly configRepo: Repository<CityPricingConfig>,
    private readonly registry: PricingRuleRegistry,
  ) {}

  async execute(context: RichPricingContext): Promise<PriceBreakdownResult> {
    const configs = await this.configRepo.find({
      where: {
        cityId:      context.cityId,
        serviceType: context.serviceType,
        isActive:    true,
      },
      order: { priority: 'ASC' },
    });

    if (!configs.length) {
      throw new NotFoundException(
        `Aucune règle de tarification active pour le service '${context.serviceType}' ` +
        `dans la ville '${context.cityId}'`,
      );
    }

    const builder = new PriceBreakdownBuilder();

    for (const config of configs) {
      // ── Vérification des conditions ─────────────────────────────────────
      if (!this.matchesConditions(config.conditions, context)) {
        this.logger.verbose(`Skipping rule '${config.ruleKey}' (conditions not met)`);
        continue;
      }

      // ── Résolution du handler ────────────────────────────────────────────
      const handler = this.registry.resolve(config.ruleKey);

      if (!handler) {
        // Règle inconnue : avertissement gracieux — pas d'exception.
        // Permet de pré-configurer des règles futures sans erreur runtime.
        this.logger.warn(
          `No handler registered for rule key '${config.ruleKey}' (config id: ${config.id}). ` +
          `Register the handler or deactivate this config.`
        );
        continue;
      }

      // ── Application de la règle ──────────────────────────────────────────
      try {
        handler.apply(context, builder, config);
        this.logger.verbose(`Applied rule '${config.ruleKey}' (priority: ${config.priority})`);
      } catch (err) {
        // Isolation des erreurs par règle pour ne pas bloquer tout le pipeline
        this.logger.error(
          `Error in rule '${config.ruleKey}' (config ${config.id}): ${(err as Error).message}`,
        );
      }
    }

    return builder.build();
  }

  // ── Évaluation des conditions ────────────────────────────────────────────

  private matchesConditions(
    conditions: RuleConditions | null | undefined,
    context: RichPricingContext,
  ): boolean {
    if (!conditions) return true;

    // Condition horaire
    if (conditions.time) {
      if (!this.inTimeWindow(context.hour, conditions.time.start, conditions.time.end)) {
        return false;
      }
    }

    // Condition jours
    if (conditions.days?.length) {
      if (!conditions.days.includes(context.dayOfWeek)) {
        return false;
      }
    }

    // Condition passagers minimum
    if (conditions.minPassengers !== undefined) {
      if ((context.passengersCount ?? 1) < conditions.minPassengers) {
        return false;
      }
    }

    // Condition annulation
    if (conditions.onlyOnCancellation === true) {
      if (!context.isCancellation) {
        return false;
      }
    }

    // ── Conditions custom extensibles ─────────────────────────────────────
    // Pour chaque condition custom, vérifier les champs connus.
    if (conditions.custom) {
      // Exemple : { weatherCondition: 'rain' }
      if (
        conditions.custom['weatherCondition'] !== undefined &&
        context.weatherCondition !== conditions.custom['weatherCondition']
      ) {
        return false;
      }

      // Exemple : { minDemandFactor: 1.5 }
      if (
        conditions.custom['minDemandFactor'] !== undefined &&
        (context.demandFactor ?? 0) < Number(conditions.custom['minDemandFactor'])
      ) {
        return false;
      }

      // Exemple : { maxEventProximityKm: 2 }
      if (
        conditions.custom['maxEventProximityKm'] !== undefined &&
        (context.eventProximityKm ?? Infinity) > Number(conditions.custom['maxEventProximityKm'])
      ) {
        return false;
      }
    }

    return true;
  }

  private inTimeWindow(hour: number, start: string, end: string): boolean {
    const [startH] = start.split(':').map(Number);
    const [endH]   = end.split(':').map(Number);
    return startH > endH
      ? hour >= startH || hour < endH   // créneau overnight (ex: 22h→06h)
      : hour >= startH && hour < endH;
  }
}
