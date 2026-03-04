import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';

export enum CityStatus {
  ACTIVE   = 'active',
  INACTIVE = 'inactive',
  COMING_SOON = 'coming_soon',
}

/**
 * Table: cities
 * Référentiel géographique. Extension multi-pays possible via countryCode.
 */
@Entity('cities')
@Index('idx_cities_slug',    ['slug'], { unique: true })
@Index('idx_cities_country', ['countryCode', 'status'])
export class City {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  /** URL-friendly identifier: ouagadougou, bobo-dioulasso */
  @Column({ length: 100, unique: true })
  slug: string;

  @Column({ length: 3, default: 'BF', name: 'country_code' })
  countryCode: string;

  @Column({ length: 3, default: 'XOF' })
  currency: string;

  @Column({ type: 'enum', enum: CityStatus, default: CityStatus.ACTIVE })
  status: CityStatus;

  /** Coordonnées centre-ville (PostGIS: point géographique) */
  @Column({ type: 'decimal', precision: 10, scale: 7, name: 'center_lat' })
  centerLat: number;

  @Column({ type: 'decimal', precision: 10, scale: 7, name: 'center_lng' })
  centerLng: number;

  /** Rayon opérationnel en kilomètres */
  @Column({ type: 'integer', default: 30, name: 'radius_km' })
  radiusKm: number;

  /** Configuration locale JSON (surcharge de tarifs, horaires, etc.) */
  @Column({ type: 'jsonb', nullable: true })
  config: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
