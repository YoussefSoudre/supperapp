import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';

export enum DeliveryStatus {
  PENDING      = 'pending',
  SEARCHING    = 'searching',
  ACCEPTED     = 'accepted',
  PICKED_UP    = 'picked_up',
  IN_TRANSIT   = 'in_transit',
  DELIVERED    = 'delivered',
  FAILED       = 'failed',
  CANCELLED    = 'cancelled',
}

export enum PackageSize {
  SMALL  = 'small',   // < 5kg
  MEDIUM = 'medium',  // 5-20kg
  LARGE  = 'large',   // > 20kg
}

/**
 * Table: deliveries
 * Module séparé de rides pour l'extensibilité métier.
 * PARTITIONNEMENT : RANGE (created_at)
 */
@Entity('deliveries')
@Index('idx_del_sender',  ['senderId', 'status', 'createdAt'])
@Index('idx_del_driver',  ['driverId', 'status'])
@Index('idx_del_city',    ['cityId', 'status'])
export class Delivery {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'sender_id' })
  senderId: string;

  @Column({ type: 'uuid', nullable: true, name: 'driver_id' })
  driverId: string | null;

  @Column({ type: 'uuid', name: 'city_id' })
  cityId: string;

  @Column({ type: 'enum', enum: DeliveryStatus, default: DeliveryStatus.PENDING })
  status: DeliveryStatus;

  @Column({ type: 'enum', enum: PackageSize, name: 'package_size' })
  packageSize: PackageSize;

  @Column({ length: 500, name: 'package_description' })
  packageDescription: string;

  @Column({ length: 500, name: 'pickup_address' })
  pickupAddress: string;

  @Column({ type: 'decimal', precision: 10, scale: 7, name: 'pickup_lat' })
  pickupLat: number;

  @Column({ type: 'decimal', precision: 10, scale: 7, name: 'pickup_lng' })
  pickupLng: number;

  @Column({ length: 500, name: 'dropoff_address' })
  dropoffAddress: string;

  @Column({ type: 'decimal', precision: 10, scale: 7, name: 'dropoff_lat' })
  dropoffLat: number;

  @Column({ type: 'decimal', precision: 10, scale: 7, name: 'dropoff_lng' })
  dropoffLng: number;

  /** Nom et téléphone du destinataire */
  @Column({ length: 100, name: 'recipient_name' })
  recipientName: string;

  @Column({ length: 20, name: 'recipient_phone' })
  recipientPhone: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'estimated_price' })
  estimatedPrice: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true, name: 'final_price' })
  finalPrice: number | null;

  @Column({ length: 3, default: 'XOF' })
  currency: string;

  /** Code de confirmation à la livraison */
  @Column({ type: 'varchar', length: 6, nullable: true, name: 'confirmation_code' })
  confirmationCode: string | null;

  @Column({ type: 'uuid', nullable: true, name: 'payment_id' })
  paymentId: string | null;

  @Column({ type: 'boolean', default: false, name: 'is_paid' })
  isPaid: boolean;

  @Column({ type: 'timestamp', nullable: true, name: 'picked_up_at' })
  pickedUpAt: Date | null;

  @Column({ type: 'timestamp', nullable: true, name: 'delivered_at' })
  deliveredAt: Date | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
