import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';

export enum UserKycStatus {
  PENDING  = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

/**
 * Table: user_kyc
 *
 * KYC des clients (distinct du KYC chauffeur).
 * Documents requis (non obligatoires à l'inscription) :
 *   - Pièce d'identité recto
 *   - Pièce d'identité verso
 *   - Selfie avec la pièce d'identité
 *
 * Le champ `addressProofUrl` est optionnel selon la ville/configuration.
 * Un seul enregistrement par utilisateur (upsert à chaque soumission).
 */
@Entity('user_kyc')
@Index('idx_user_kyc_user', ['userId'], { unique: true })
@Index('idx_user_kyc_status', ['status'])
export class UserKyc {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'user_id', unique: true })
  userId: string;

  @Column({
    type: 'enum',
    enum: UserKycStatus,
    default: UserKycStatus.PENDING,
  })
  status: UserKycStatus;

  /** Recto de la pièce d'identité nationale (CNI / passeport) */
  @Column({ type: 'varchar', length: 500, name: 'id_card_front_url' })
  idCardFrontUrl: string;

  /** Verso de la pièce d'identité (null si passeport) */
  @Column({ type: 'varchar', length: 500, nullable: true, name: 'id_card_back_url' })
  idCardBackUrl: string | null;

  /** Selfie du client tenant sa pièce d'identité visible */
  @Column({ type: 'varchar', length: 500, name: 'selfie_url' })
  selfieUrl: string;

  /** Justificatif de domicile — optionnel */
  @Column({ type: 'varchar', length: 500, nullable: true, name: 'address_proof_url' })
  addressProofUrl: string | null;

  /** Motif de rejet communiqué au client */
  @Column({ type: 'text', nullable: true, name: 'rejection_reason' })
  rejectionReason: string | null;

  /** UUID de l'admin ayant traité le dossier */
  @Column({ type: 'uuid', nullable: true, name: 'reviewed_by' })
  reviewedBy: string | null;

  @Column({ type: 'timestamp', nullable: true, name: 'reviewed_at' })
  reviewedAt: Date | null;

  @Column({ type: 'timestamp', name: 'submitted_at', default: () => 'NOW()' })
  submittedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
