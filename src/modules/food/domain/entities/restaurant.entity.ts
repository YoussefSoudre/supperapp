import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';

/**
 * Table: restaurants
 */
@Entity('restaurants')
@Index('idx_rest_city',   ['cityId', 'isActive'])
@Index('idx_rest_slug',   ['slug'], { unique: true })
export class Restaurant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'owner_id' })
  ownerId: string;

  @Column({ type: 'uuid', name: 'city_id' })
  cityId: string;

  @Column({ length: 150 })
  name: string;

  @Column({ length: 150, unique: true })
  slug: string;

  /** Catégorie culinaire : Burgers, Africain, Pizza, Sushi, etc. */
  @Column({ type: 'varchar', length: 100, nullable: true })
  category: string | null;

  @Column({ length: 500, name: 'address' })
  address: string;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  lat: number;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  lng: number;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string | null;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 5.0 })
  rating: number;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  @Column({ type: 'boolean', default: false, name: 'is_open' })
  isOpen: boolean;

  /** Horaires: { mon: {open:"08:00",close:"22:00"}, ... } */
  @Column({ type: 'jsonb', nullable: true, name: 'opening_hours' })
  openingHours: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
