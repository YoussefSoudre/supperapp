import { Injectable, Logger, UnsupportedMediaTypeException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { join, extname, resolve, normalize } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { rename } from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { AnnouncementMediaType } from '../domain/entities/announcement.entity';

export interface UploadResult {
  url:          string;
  mediaType:    AnnouncementMediaType;
  originalName: string;
  sizeBytes:    number;
  mimeType:     string;
}

/** Extensions acceptées par type */
const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);
const VIDEO_EXTS = new Set(['.mp4', '.webm', '.mov']);

/** Taille max en octets */
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;   // 10 MB
const MAX_VIDEO_BYTES = 200 * 1024 * 1024;  // 200 MB

/**
 * MediaStorageService
 * ────────────────────
 * Gère le stockage des fichiers média (image/vidéo) des annonces.
 *
 * Stratégie :
 *   - Dev  : disque local → /uploads/announcements/{filename}
 *   - Prod : remplacer `saveLocal()` par `uploadToS3()` ou `uploadToCDN()`
 *
 * Le dossier est créé automatiquement s'il n'existe pas.
 */
@Injectable()
export class MediaStorageService {
  private readonly logger      = new Logger(MediaStorageService.name);
  private readonly uploadDir:   string;
  private readonly publicBase:  string;

  constructor(private readonly config: ConfigService) {
    // Dossier physique de stockage (configurable via env)
    this.uploadDir = config.get<string>(
      'UPLOAD_DIR',
      join(process.cwd(), 'uploads', 'announcements'),
    );

    // Base URL publique pour construire les URLs retournées
    this.publicBase = config.get<string>(
      'PUBLIC_UPLOAD_URL',
      'http://localhost:3000/static/announcements',
    );

    // Créer le dossier s'il n'existe pas
    if (!existsSync(this.uploadDir)) {
      mkdirSync(this.uploadDir, { recursive: true });
      this.logger.log(`Created upload directory: ${this.uploadDir}`);
    }
  }

  /**
   * Sauvegarde un fichier uploadé (Buffer issu de Multer) et retourne
   * l'URL publique + les métadonnées.
   *
   * @param file     L'objet Express.Multer.File
   */
  async save(file: Express.Multer.File): Promise<UploadResult> {
    const rawExt    = extname(file.originalname).toLowerCase();
    const ext       = this.sanitizeExtension(rawExt);        // protection path traversal
    const mediaType = this.resolveMediaType(ext, file.mimetype);

    this.validateSize(file, mediaType);

    const filename  = `${uuidv4()}${ext}`;
    const destPath  = resolve(join(this.uploadDir, filename));

    // ── Protection path traversal — s'assurer que destPath est dans uploadDir ──
    const safeBase = resolve(this.uploadDir);
    if (!destPath.startsWith(safeBase + require('path').sep) && destPath !== safeBase) {
      this.logger.error(`Path traversal detected: ${destPath}`);
      throw new BadRequestException('Nom de fichier invalide.');
    }

    // Si Multer a déjà écrit le fichier sur disque (diskStorage), on le déplace
    // Si Multer est en memoryStorage, on écrit le buffer
    if (file.path) {
      await rename(file.path, destPath);
    } else {
      const { writeFile } = await import('fs/promises');
      await writeFile(destPath, file.buffer);
    }

    const url = `${this.publicBase}/${filename}`;

    this.logger.log(
      `Media saved: ${filename} · type=${mediaType} · size=${file.size} bytes`,
    );

    return {
      url,
      mediaType,
      originalName: file.originalname,
      sizeBytes:    file.size,
      mimeType:     file.mimetype,
    };
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  /**
   * Sanitise l'extension pour prévenir les attaques par path traversal.
   * N'accepte que les extensions composées de caractères alphanumériques (max 5 chars).
   */
  private sanitizeExtension(ext: string): string {
    // Supprimer tout sauf lettres et chiffres
    const clean = ext.replace(/[^a-z0-9]/g, '');
    if (clean.length === 0 || clean.length > 5) {
      throw new BadRequestException('Extension de fichier non valide.');
    }
    return `.${clean}`;
  }

  private resolveMediaType(
    ext: string,
    mimetype: string,
  ): AnnouncementMediaType {
    if (IMAGE_EXTS.has(ext) || mimetype.startsWith('image/')) {
      return AnnouncementMediaType.IMAGE;
    }
    if (VIDEO_EXTS.has(ext) || mimetype.startsWith('video/')) {
      return AnnouncementMediaType.VIDEO;
    }
    throw new UnsupportedMediaTypeException(
      `Unsupported file type: ${ext} (${mimetype}). ` +
      `Accepted: images (jpg/png/webp/gif) and videos (mp4/webm/mov).`,
    );
  }

  private validateSize(file: Express.Multer.File, type: AnnouncementMediaType): void {
    const max = type === AnnouncementMediaType.VIDEO ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;

    if (file.size > max) {
      const maxMb = Math.round(max / 1024 / 1024);
      throw new UnsupportedMediaTypeException(
        `File too large: ${Math.round(file.size / 1024 / 1024)} MB. ` +
        `Maximum allowed for ${type}: ${maxMb} MB.`,
      );
    }
  }
}
