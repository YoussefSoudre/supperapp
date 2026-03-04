import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';

/**
 * Table: city_payment_configs
 * Configuration des providers de paiement par ville.
 * Permet d'activer/désactiver Orange Money selon les villes,
 * configurer les clés API locales, etc.
 */
@Entity('city_payment_configs')
@Index('idx_cpc_city_provider', ['cityId', 'provider'], { unique: true })
export class CityPaymentConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'city_id' })
  cityId: string;

  @Column({ length: 50 })
  provider: string;

  @Column({ type: 'boolean', default: true, name: 'is_enabled' })
  isEnabled: boolean;

  /** Config chiffrée: { api_key, secret, merchant_id, webhook_secret } */
  @Column({ type: 'jsonb', name: 'config' })
  config: Record<string, unknown>;

  /** Frais de transaction en % */
  @Column({ type: 'decimal', precision: 5, scale: 4, default: 0, name: 'fee_percent' })
  feePercent: number;

  /** Frais fixe en centimes */
  @Column({ type: 'bigint', default: 0, name: 'fee_fixed' })
  feeFixed: number;

  @Column({ type: 'integer', default: 0 })
  priority: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
