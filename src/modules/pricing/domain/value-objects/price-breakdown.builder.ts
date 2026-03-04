/**
 * PriceBreakdownBuilder — Value Object mutable (pattern Accumulator).
 *
 * Chaque règle du pipeline appelle une méthode de ce builder.
 * La méthode `build()` calcule les totaux finaux et retourne un objet immuable.
 *
 * Structure du prix final :
 *   subtotal  = baseFare + distanceCost + timeCost
 *   surged    = subtotal × surgeMultiplier
 *   total     = surged - sum(discounts) + sum(fees)
 *   driverAmt = total - commission
 */
export interface LineItem {
  key: string;
  amount: number;
  label: string;
}

export interface PriceBreakdownResult {
  /** Devise ISO-4217 */
  currency: string;

  // ── Composantes ──────────────────────────────────────────────────────────
  baseFare: number;
  distanceCost: number;
  timeCost: number;

  // ── Surge ─────────────────────────────────────────────────────────────────
  surgeMultiplier: number;
  surgeAmount: number;

  // ── Réductions & frais ────────────────────────────────────────────────────
  discounts: LineItem[];
  fees: LineItem[];

  // ── Commission ────────────────────────────────────────────────────────────
  commissionRate: number;   // 0-1 (ex: 0.15 → 15%)
  commissionAmount: number;

  // ── Totaux ────────────────────────────────────────────────────────────────
  /** baseFare + distanceCost + timeCost (avant surge ni réductions) */
  subtotal: number;
  /** subtotal × surgeMultiplier - sum(discounts) + sum(fees) */
  total: number;
  /** total - commissionAmount (revenu chauffeur) */
  driverAmount: number;

  /** true si le minimum tarifaire a été appliqué */
  minimumApplied: boolean;
}

export class PriceBreakdownBuilder {
  private _baseFare        = 0;
  private _distanceCost    = 0;
  private _timeCost        = 0;
  private _surgeMultiplier = 1.0;
  private _discounts: LineItem[] = [];
  private _fees: LineItem[]      = [];
  private _commissionRate  = 0;
  private _minimumFare     = 0;
  private _maximumFare     = Infinity;
  private _currency: string;

  constructor(currency = 'XOF') {
    this._currency = currency;
  }

  // ── Setters appelés par les IPricingRuleHandler ───────────────────────────

  setBaseFare(amount: number): this {
    this._baseFare = amount;
    return this;
  }

  addDistanceCost(amount: number): this {
    this._distanceCost += amount;
    return this;
  }

  addTimeCost(amount: number): this {
    this._timeCost += amount;
    return this;
  }

  /**
   * Applique un multiplicateur de surge.
   * Si plusieurs règles surge coexistent, on conserve le plus élevé.
   */
  applySurgeMultiplier(multiplier: number): this {
    this._surgeMultiplier = Math.max(this._surgeMultiplier, multiplier);
    return this;
  }

  addDiscount(key: string, amount: number, label: string): this {
    this._discounts.push({ key, amount: Math.abs(amount), label });
    return this;
  }

  addFee(key: string, amount: number, label: string): this {
    this._fees.push({ key, amount: Math.abs(amount), label });
    return this;
  }

  setCommissionRate(rate: number): this {
    this._commissionRate = Math.min(Math.max(rate, 0), 1);
    return this;
  }

  setMinimumFare(amount: number): this {
    this._minimumFare = amount;
    return this;
  }

  setMaximumFare(amount: number): this {
    this._maximumFare = amount;
    return this;
  }

  setCurrency(currency: string): this {
    this._currency = currency;
    return this;
  }

  // ── Construction du résultat final ────────────────────────────────────────

  build(): PriceBreakdownResult {
    const subtotal      = this._baseFare + this._distanceCost + this._timeCost;
    const surgedAmount  = subtotal * this._surgeMultiplier;
    const surgeAmount   = surgedAmount - subtotal;

    const totalDiscounts = this._discounts.reduce((s, d) => s + d.amount, 0);
    const totalFees      = this._fees.reduce((s, f) => s + f.amount, 0);

    const rawTotal      = surgedAmount - totalDiscounts + totalFees;
    const clampedTotal  = Math.min(Math.max(rawTotal, this._minimumFare), this._maximumFare);
    const minimumApplied = clampedTotal > rawTotal || clampedTotal < rawTotal;

    const commissionAmount = Math.round(clampedTotal * this._commissionRate);
    const driverAmount     = Math.round(clampedTotal) - commissionAmount;

    return {
      currency:         this._currency,
      baseFare:         Math.round(this._baseFare),
      distanceCost:     Math.round(this._distanceCost),
      timeCost:         Math.round(this._timeCost),
      surgeMultiplier:  this._surgeMultiplier,
      surgeAmount:      Math.round(surgeAmount),
      discounts:        this._discounts.map(d => ({ ...d, amount: Math.round(d.amount) })),
      fees:             this._fees.map(f => ({ ...f, amount: Math.round(f.amount) })),
      commissionRate:   this._commissionRate,
      commissionAmount,
      subtotal:         Math.round(subtotal),
      total:            Math.round(clampedTotal),
      driverAmount,
      minimumApplied,
    };
  }
}
