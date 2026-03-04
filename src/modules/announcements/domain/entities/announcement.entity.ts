import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';

export enum AnnouncementMediaType {
  IMAGE = 'image',  // JPEG, PNG, WebP, GIF
  VIDEO = 'video',  // MP4, WebM
}

export enum AnnouncementType {
  INFO         = 'info',         // Information générale
  MAINTENANCE  = 'maintenance',  // Maintenance planifiée
  PROMOTION    = 'promotion',    // Offre promotionnelle
  ALERT        = 'alert',        // Alerte urgente
  UPDATE       = 'update',       // Mise à jour application
}

export enum AnnouncementStatus {
  DRAFT      = 'draft',       // Brouillon (non visible)
  PUBLISHED  = 'published',   // Visible, en cours
  ARCHIVED   = 'archived',    // Expirée ou retirée
}

export enum AnnouncementScope {
  GLOBAL = 'global',  // Toutes les villes
  CITY   = 'city',    // Ville précise
}

/**
 * Table: system_announcements
 * ─────────────────────────────
 * Représente une annonce système créée par un admin global ou un admin ville.
 *
 * Cycle de vie :
 *   DRAFT → PUBLISHED (déclenche broadcast push + in_app + websocket)
 *   PUBLISHED → ARCHIVED (manuel ou automatique via expiresAt)
 *
 * Scoping :
 *   scope = 'global' → visible par tous les utilisateurs de toutes les villes
 *   scope = 'city'   → cityId requis → visible uniquement dans cette ville
 */
@Entity('system_announcements')
@Index('idx_ann_status_scope',   ['status', 'scope'])
@Index('idx_ann_city_status',    ['cityId', 'status'])
@Index('idx_ann_published_at',   ['publishedAt'])
@Index('idx_ann_expires_at',     ['expiresAt'])
export class SystemAnnouncement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Admin qui a créé l'annonce */
  @Column({ type: 'uuid', name: 'created_by' })
  createdBy: string;

  @Column({ length: 250 })
  title: string;

  @Column({ type: 'text' })
  content: string;

  /** Texte court affiché dans la notification push (≤ 100 chars) */
  @Column({ length: 100, name: 'short_description', nullable: true })
  shortDescription: string | null;

  @Column({
    type: 'enum',
    enum: AnnouncementType,
    default: AnnouncementType.INFO,
  })
  type: AnnouncementType;

  @Column({
    type: 'enum',
    enum: AnnouncementStatus,
    default: AnnouncementStatus.DRAFT,
  })
  status: AnnouncementStatus;

  @Column({
    type: 'enum',
    enum: AnnouncementScope,
    default: AnnouncementScope.GLOBAL,
  })
  scope: AnnouncementScope;

  /**
   * Ville ciblée si scope = 'city'.
   * null si scope = 'global'.
   */
  @Column({ type: 'uuid', nullable: true, name: 'city_id' })
  cityId: string | null;

  /** Canaux de diffusion lors de la publication : push, in_app, websocket */
  @Column({ type: 'jsonb', default: () => "'[\"push\",\"in_app\",\"websocket\"]'" })
  channels: string[];

  /** Annonce épinglée (affichée en premier dans le feed) */
  @Column({ type: 'boolean', default: false })
  pinned: boolean;

  /** Lien optionnel : deep link app ou URL web */
  @Column({ type: 'text', nullable: true, name: 'action_url' })
  actionUrl: string | null;

  /**
   * URL publique de l'image ou vidéo associée à l'annonce.
   * Stockée sur disque local (dev) ou S3/CDN (prod).
   * null = aucun média.
   */
  @Column({ type: 'text', nullable: true, name: 'media_url' })
  mediaUrl: string | null;

  /** Type du média : image | video */
  @Column({
    type: 'enum',
    enum: AnnouncementMediaType,
    nullable: true,
    name: 'media_type',
  })
  mediaType: AnnouncementMediaType | null;

  /**
   * Thumbnail automatique pour les vidéos (première frame ou image dédiée).
   * Utilisé dans les listes et notifications push.
   */
  @Column({ type: 'text', nullable: true, name: 'media_thumbnail_url' })
  mediaThumbnailUrl: string | null;

  /** Données additionnelles (ex: deepLink, dimensions) */
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  /** Rôles ciblés : ['user', 'driver', 'all'] — null = tous les utilisateurs */
  @Column({ type: 'jsonb', nullable: true, name: 'target_roles' })
  targetRoles: string[] | null;

  /** Date de publication effective (null si DRAFT) */
  @Column({ type: 'timestamptz', nullable: true, name: 'published_at' })
  publishedAt: Date | null;

  /** Date d'expiration automatique (null = jamais) */
  @Column({ type: 'timestamptz', nullable: true, name: 'expires_at' })
  expiresAt: Date | null;

  /** ID du broadcast BullMQ créé lors de la publication */
  @Column({ type: 'uuid', nullable: true, name: 'broadcast_id' })
  broadcastId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
