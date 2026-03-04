import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';

export enum FoodOrderStatus {
  PENDING           = 'pending',
  CONFIRMED         = 'confirmed',
  PREPARING         = 'preparing',
  READY_FOR_PICKUP  = 'ready_for_pickup',
  PICKED_UP         = 'picked_up',
  DELIVERED         = 'delivered',
  CANCELLED         = 'cancelled',
}

/**
 * Table: food_orders
 * PARTITIONNEMENT: RANGE (created_at)
 */
@Entity('food_orders')
@Index('idx_fo_user',       ['userId', 'status', 'createdAt'])
@Index('idx_fo_restaurant', ['restaurantId', 'status'])
@Index('idx_fo_driver',     ['driverId', 'status'])
export class FoodOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @Column({ type: 'uuid', name: 'restaurant_id' })
  restaurantId: string;

  @Column({ type: 'uuid', nullable: true, name: 'driver_id' })
  driverId: string | null;

  @Column({ type: 'enum', enum: FoodOrderStatus, default: FoodOrderStatus.PENDING })
  status: FoodOrderStatus;

  /**
   * Items de commande: [{ itemId, name, qty, unitPrice, notes }]
   * JSON pour éviter une table order_items (scalabilité)
   * → Migrez vers order_items si analytics item-level nécessaire
   */
  @Column({ type: 'jsonb' })
  items: Array<{
    itemId: string;
    name: string;
    qty: number;
    unitPrice: number;
    notes?: string;
  }>;

  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'subtotal' })
  subtotal: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'delivery_fee' })
  deliveryFee: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  discount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  total: number;

  @Column({ length: 3, default: 'XOF' })
  currency: string;

  @Column({ length: 500, name: 'delivery_address' })
  deliveryAddress: string;

  @Column({ type: 'decimal', precision: 10, scale: 7, name: 'delivery_lat' })
  deliveryLat: number;

  @Column({ type: 'decimal', precision: 10, scale: 7, name: 'delivery_lng' })
  deliveryLng: number;

  @Column({ type: 'text', nullable: true, name: 'special_instructions' })
  specialInstructions: string | null;

  @Column({ type: 'uuid', nullable: true, name: 'payment_id' })
  paymentId: string | null;

  @Column({ type: 'boolean', default: false, name: 'is_paid' })
  isPaid: boolean;

  @Column({ type: 'timestamp', nullable: true, name: 'estimated_delivery_at' })
  estimatedDeliveryAt: Date | null;

  @Column({ type: 'timestamp', nullable: true, name: 'delivered_at' })
  deliveredAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
