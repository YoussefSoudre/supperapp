import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';

export enum PricingServiceType {
  MOTO     = 'moto',
  CAR      = 'car',
  CARPOOL  = 'carpool',
  DELIVERY = 'delivery',
  FOOD     = 'food',
}

/**
 * Table: pricing_rules
 * Moteur de tarification configurable par ville et service.
 * Plusieurs règles peuvent coexister avec priorité (priority field).
 * Ex: règle nuit, règle weekend, règle zone aéroport.
 *
 * FORMULE : price = base_fare + (per_km * distance) + (per_minute * duration)
 *           avec min/max guardrails et surge multiplier
 */
@Entity('pricing_rules')
@Index('idx_pricing_city_service', ['cityId', 'serviceType', 'isActive'])
@Index('idx_pricing_priority',     ['cityId', 'serviceType', 'priority'])
export class PricingRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'city_id' })
  cityId: string;

  @Column({ type: 'enum', enum: PricingServiceType, name: 'service_type' })
  serviceType: PricingServiceType;

  @Column({ length: 100 })
  name: string;

  /** Tarif de prise en charge (XOF) */
  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'base_fare' })
  baseFare: number;

  /** Par kilomètre (XOF) */
  @Column({ type: 'decimal', precision: 8, scale: 2, name: 'per_km_rate' })
  perKmRate: number;

  /** Par minute (XOF) */
  @Column({ type: 'decimal', precision: 8, scale: 2, name: 'per_minute_rate' })
  perMinuteRate: number;

  /** Prix minimum garanti */
  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'minimum_fare' })
  minimumFare: number;

  /** Prix maximum plafonné */
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, name: 'maximum_fare' })
  maximumFare: number | null;

  /** Multiplicateur de surge (1.0 = normal) */
  @Column({ type: 'decimal', precision: 4, scale: 2, default: 1.0, name: 'surge_multiplier' })
  surgeMultiplier: number;

  @Column({ length: 3, default: 'XOF' })
  currency: string;

  /** Horaires d'application: { start: "22:00", end: "06:00" } */
  @Column({ type: 'jsonb', nullable: true, name: 'time_conditions' })
  timeConditions: Record<string, unknown> | null;

  /** Jours applicables: [1,2,3,4,5] (lundi=1) */
  @Column({ type: 'jsonb', nullable: true, name: 'day_conditions' })
  dayConditions: number[] | null;

  @Column({ type: 'integer', default: 0 })
  priority: number;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
