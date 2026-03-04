import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, Index,
} from 'typeorm';

export enum ModificationField {
  DROPOFF_ADDRESS = 'dropoff_address',
  DROPOFF_COORDS  = 'dropoff_coords',
  SCHEDULED_AT    = 'scheduled_at',
  RIDE_TYPE       = 'ride_type',
  PICKUP_ADDRESS  = 'pickup_address',
  PICKUP_COORDS   = 'pickup_coords',
}

export enum ModificationPhase {
  /** Avant que le chauffeur soit assigné */
  PRE_ACCEPTANCE  = 'pre_acceptance',
  /** Après assignation, avant départ chauffeur */
  PRE_DEPARTURE   = 'pre_departure',
  /** Course en cours (modification destination uniquement) */
  IN_PROGRESS     = 'in_progress',
}

/**
 * Table: ride_modification_logs
 * Audit trail immuable de toutes les modifications de course.
 * Règle d'or : jamais d'UPDATE ni de DELETE sur cette table.
 * Partitionnement: RANGE (created_at) avec rides.
 */
@Entity('ride_modification_logs')
@Index('idx_rml_ride',    ['rideId', 'createdAt'])
@Index('idx_rml_user',    ['modifiedById'])
export class RideModificationLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'ride_id' })
  rideId: string;

  /** Qui a fait la modification: user ou admin */
  @Column({ type: 'uuid', name: 'modified_by_id' })
  modifiedById: string;

  @Column({ type: 'enum', enum: ModificationField, name: 'field' })
  field: ModificationField;

  @Column({ type: 'enum', enum: ModificationPhase, name: 'phase' })
  phase: ModificationPhase;

  @Column({ type: 'text', name: 'old_value' })
  oldValue: string;

  @Column({ type: 'text', name: 'new_value' })
  newValue: string;

  /** Frais de modification appliqués en centimes XOF pour cette modification */
  @Column({ type: 'integer', default: 0, name: 'modification_fee_xof' })
  modificationFeeXof: number;

  /** Statut de la course au moment de la modification */
  @Column({ length: 30, name: 'ride_status_at_modification' })
  rideStatusAtModification: string;

  /** Prix estimé avant modification */
  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'old_estimated_price' })
  oldEstimatedPrice: number;

  /** Prix estimé après recalcul */
  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'new_estimated_price' })
  newEstimatedPrice: number;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
