import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, Index,
} from 'typeorm';

/**
 * Table: permissions
 * Granularité fine : resource:action
 * Ex: rides:read, rides:cancel, users:ban, payments:refund
 *
 * Naming convention slug: "{resource}:{action}"
 *   resource = module  (rides, users, payments, delivery, food, analytics, admin, pricing, drivers)
 *   action   = verb    (read, manage, cancel, ban, refund, export, impersonate, configure)
 */
@Entity('permissions')
@Index('idx_perms_slug',     ['slug'],     { unique: true })
@Index('idx_perms_resource', ['resource'])
export class Permission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Clé unique lisible machine — jamais modifiée après création */
  @Column({ length: 100, unique: true })
  slug: string;  // ex: 'rides:manage', 'users:ban', 'payments:refund'

  @Column({ length: 100 })
  resource: string;  // rides | users | payments | delivery | food | analytics | admin | pricing | drivers

  @Column({ length: 100 })
  action: string;    // read | manage | cancel | ban | refund | export | impersonate | configure

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
