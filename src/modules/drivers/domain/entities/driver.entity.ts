import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';

export enum DriverStatus {
  PENDING_APPROVAL = 'pending_approval',
  ACTIVE           = 'active',
  SUSPENDED        = 'suspended',
  OFFLINE          = 'offline',
  ONLINE           = 'online',
  ON_TRIP          = 'on_trip',
}

export enum VehicleType {
  MOTO   = 'moto',
  CAR    = 'car',
  PICKUP = 'pickup',
  BIKE   = 'bike',  // livraison vélo
}

/**
 * Table: drivers
 * Index géospatial sur last_lat/last_lng pour le dispatch (PostGIS conseillé)
 */
@Entity('drivers')
@Index('idx_drivers_user',          ['userId'], { unique: true })
@Index('idx_drivers_city_status',   ['cityId', 'status'])
@Index('idx_drivers_vehicle',       ['vehicleType', 'status'])
@Index('idx_drivers_location',      ['lastLat', 'lastLng'])  // spatial index à créer manuellement
export class Driver {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'user_id', unique: true })
  userId: string;

  @Column({ type: 'uuid', name: 'city_id' })
  cityId: string;

  @Column({ type: 'enum', enum: DriverStatus, default: DriverStatus.PENDING_APPROVAL })
  status: DriverStatus;

  @Column({ type: 'enum', enum: VehicleType })
  vehicleType: VehicleType;

  @Column({ length: 50, name: 'vehicle_plate' })
  vehiclePlate: string;

  @Column({ length: 100, name: 'vehicle_model', nullable: true })
  vehicleModel: string | null;

  /** Dernière position GPS connue */
  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true, name: 'last_lat' })
  lastLat: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true, name: 'last_lng' })
  lastLng: number | null;

  @Column({ type: 'timestamp', nullable: true, name: 'last_seen_at' })
  lastSeenAt: Date | null;

  /** Note moyenne (0.0 – 5.0) */
  @Column({ type: 'decimal', precision: 3, scale: 2, default: 5.0 })
  rating: number;

  @Column({ type: 'integer', default: 0, name: 'total_trips' })
  totalTrips: number;

  /** Documents KYC: { id_card: url, license: url, insurance: url } */
  @Column({ type: 'jsonb', nullable: true })
  documents: Record<string, string> | null;

  @Column({ type: 'boolean', default: false, name: 'documents_verified' })
  documentsVerified: boolean;

  @Column({ type: 'boolean', default: true, name: 'accepts_cash' })
  acceptsCash: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
