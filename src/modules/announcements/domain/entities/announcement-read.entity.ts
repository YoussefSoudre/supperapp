import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, Index, Unique,
} from 'typeorm';

/**
 * Table: announcement_reads
 * ─────────────────────────
 * Enregistre qu'un utilisateur a lu (ou marqué comme lue) une annonce.
 *
 * Contrainte UNIQUE (userId, announcementId) → un seul enregistrement par paire.
 * Utilisé pour :
 *   - Savoir si une annonce a été vue par un utilisateur donné
 *   - Calculer le taux de lecture (readCount / audience estimée)
 *   - Filtrer les annonces "non lues" dans le feed utilisateur
 */
@Entity('announcement_reads')
@Unique('uq_ann_read_user_ann', ['userId', 'announcementId'])
@Index('idx_ann_read_announcement', ['announcementId'])
@Index('idx_ann_read_user',         ['userId'])
export class AnnouncementRead {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Utilisateur qui a lu l'annonce */
  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  /** Annonce lue */
  @Column({ type: 'uuid', name: 'announcement_id' })
  announcementId: string;

  /** Date de première lecture */
  @CreateDateColumn({ name: 'read_at' })
  readAt: Date;
}
