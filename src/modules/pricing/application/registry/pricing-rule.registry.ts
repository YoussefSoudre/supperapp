import { Injectable, Logger } from '@nestjs/common';
import { IPricingRuleHandler } from '../../domain/interfaces/pricing-rule-handler.interface';

/**
 * PricingRuleRegistry — Annuaire dynamique des handlers de règles.
 *
 * Chaque IPricingRuleHandler s'enregistre lui-même dans OnModuleInit.
 * Le pipeline interroge ce registre pour résoudre la règle associée à chaque
 * CityPricingConfig sans connaître les implémentations concrètes.
 *
 * Open/Closed Principle :
 *   • Ouvert à l'extension  → ajouter un handler + l'injecter dans PricingModule.
 *   • Fermé à la modification → aucune ligne existante à modifier.
 */
@Injectable()
export class PricingRuleRegistry {
  private readonly logger = new Logger(PricingRuleRegistry.name);
  private readonly handlers = new Map<string, IPricingRuleHandler>();

  register(handler: IPricingRuleHandler): void {
    if (this.handlers.has(handler.key)) {
      this.logger.warn(`Rule key '${handler.key}' already registered — overwriting.`);
    }
    this.handlers.set(handler.key, handler);
    this.logger.debug(`Registered pricing rule: '${handler.key}'`);
  }

  resolve(key: string): IPricingRuleHandler | undefined {
    return this.handlers.get(key);
  }

  listKeys(): string[] {
    return [...this.handlers.keys()];
  }
}
