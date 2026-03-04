import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';

export enum RideStatus {
  PENDING    = 'pending',
  SEARCHING  = 'searching',      // recherche de chauffeur
  ACCEPTED   = 'accepted',
  DRIVER_EN_ROUTE = 'driver_en_route',
  ARRIVED    = 'arrived',
  IN_PROGRESS = 'in_progress',
  COMPLETED  = 'completed',
  CANCELLED  = 'cancelled',
  SCHEDULED  = 'scheduled',
  NO_DRIVER  = 'no_driver',
}

export enum RideType {
  MOTO     = 'moto',
  CAR      = 'car',
  CARPOOL  = 'carpool',
}

export enum RideCancelledBy {
  USER     = 'user',
  DRIVER   = 'driver',
  SYSTEM   = 'system',
  ADMIN    = 'admin',
}

/**
 * Table: rides
 *
 * STRATÉGIE DE PARTITIONNEMENT :
 *   PARTITION BY RANGE (created_at) → une partition par mois
 *   → rides_2026_01, rides_2026_02, ...
 *   Avantage : requêtes historiques isolées, DROP PARTITION rapide
 *
 * INDEX COMPOSITES :
 *   - (user_id, status, created_at)  → "mes courses"
 *   - (driver_id, status)            → "courses du chauffeur"
 *   - (city_id, status, created_at)  → analytics par ville
 *   - (scheduled_at) WHERE status='scheduled' → planification
 */
@Entity('rides')
@Index('idx_rides_user_status',    ['userId', 'status', 'createdAt'])
@Index('idx_rides_driver_status',  ['driverId', 'status'])
@Index('idx_rides_city',           ['cityId', 'status', 'createdAt'])
@Index('idx_rides_scheduled',      ['scheduledAt'], { where: '"status" = \'scheduled\'' })
@Index('idx_rides_status',         ['status'])
export class Ride {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @Column({ type: 'uuid', nullable: true, name: 'driver_id' })
  driverId: string | null;

  @Column({ type: 'uuid', name: 'city_id' })
  cityId: string;

  @Column({ type: 'enum', enum: RideType })
  type: RideType;

  @Column({ type: 'enum', enum: RideStatus, default: RideStatus.PENDING })
  status: RideStatus;

  // ─── Origine ────────────────────────────────────────────────────────────────

  @Column({ length: 500, name: 'pickup_address' })
  pickupAddress: string;

  @Column({ type: 'decimal', precision: 10, scale: 7, name: 'pickup_lat' })
  pickupLat: number;

  @Column({ type: 'decimal', precision: 10, scale: 7, name: 'pickup_lng' })
  pickupLng: number;

  // ─── Destination ──────────────────────────────────────────────────────────

  @Column({ length: 500, name: 'dropoff_address' })
  dropoffAddress: string;

  @Column({ type: 'decimal', precision: 10, scale: 7, name: 'dropoff_lat' })
  dropoffLat: number;

  @Column({ type: 'decimal', precision: 10, scale: 7, name: 'dropoff_lng' })
  dropoffLng: number;

  // ─── Tarification ─────────────────────────────────────────────────────────

  /** Prix estimé avant départ */
  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'estimated_price' })
  estimatedPrice: number;

  /** Prix final (null jusqu'à completion) */
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true, name: 'final_price' })
  finalPrice: number | null;

  @Column({ length: 3, default: 'XOF' })
  currency: string;

  @Column({ type: 'decimal', precision: 4, scale: 2, default: 1.0, name: 'surge_factor' })
  surgeFactor: number;

  /** ID de la règle de prix appliquée (FK vers pricing_rules) */
  @Column({ type: 'uuid', nullable: true, name: 'pricing_rule_id' })
  pricingRuleId: string | null;

  // ─── Métriques ────────────────────────────────────────────────────────────

  /** Distance en km */
  @Column({ type: 'decimal', precision: 8, scale: 3, nullable: true, name: 'distance_km' })
  distanceKm: number | null;

  /** Durée en secondes */
  @Column({ type: 'integer', nullable: true, name: 'duration_seconds' })
  durationSeconds: number | null;

  // ─── Timestamps métier ───────────────────────────────────────────────────

  @Column({ type: 'timestamp', nullable: true, name: 'accepted_at' })
  acceptedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true, name: 'started_at' })
  startedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true, name: 'completed_at' })
  completedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true, name: 'cancelled_at' })
  cancelledAt: Date | null;

  /** Pour courses planifiées */
  @Column({ type: 'timestamp', nullable: true, name: 'scheduled_at' })
  scheduledAt: Date | null;

  // ─── Annulation ───────────────────────────────────────────────────────────

  @Column({ type: 'enum', enum: RideCancelledBy, nullable: true, name: 'cancelled_by' })
  cancelledBy: RideCancelledBy | null;

  @Column({ length: 500, nullable: true, name: 'cancellation_reason' })
  cancellationReason: string | null;

  // ─── Paiement ─────────────────────────────────────────────────────────────

  @Column({ type: 'uuid', nullable: true, name: 'payment_id' })
  paymentId: string | null;

  @Column({ type: 'boolean', default: false, name: 'is_paid' })
  isPaid: boolean;

  // ─── Notes ────────────────────────────────────────────────────────────────

  @Column({ type: 'integer', nullable: true, name: 'user_rating' })
  userRating: number | null;

  @Column({ type: 'integer', nullable: true, name: 'driver_rating' })
  driverRating: number | null;

  @Column({ type: 'text', nullable: true, name: 'user_comment' })
  userComment: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  /** Nombre total de modifications (incrémenté à chaque PATCH /modify) */
  @Column({ type: 'integer', default: 0, name: 'modification_count' })
  modificationCount: number;

  /** Total des frais de modification cumulés en centimes XOF */
  @Column({ type: 'integer', default: 0, name: 'modification_fee_total_xof' })
  modificationFeeTotalXof: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
