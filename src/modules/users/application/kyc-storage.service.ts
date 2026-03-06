import { Injectable, Logger, UnsupportedMediaTypeException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { join, extname, resolve } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { rename, writeFile } from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { sep } from 'path';

export interface KycUploadResult {
  url:          string;
  originalName: string;
  sizeBytes:    number;
  mimeType:     string;
}

/** Extensions acceptées pour les documents KYC (images + PDF) */
const ALLOWED_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.pdf']);
const ALLOWED_MIMETYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

/**
 * KycStorageService
 * ──────────────────
 * Stockage des documents KYC clients (images uniquement).
 *
 * Stratégie identique à MediaStorageService :
 *   - Dev  : disque local → /uploads/kyc/{filename}
 *   - Prod : remplacer saveLocal par un upload S3/CDN
 *
 * Sécurité :
 *   - Vérification MIME type + extension
 *   - Protection path traversal sur le nom de fichier
 *   - Taille limitée à 10 MB
 */
@Injectable()
export class KycStorageService {
  private readonly logger     = new Logger(KycStorageService.name);
  private readonly uploadDir:  string;
  private readonly publicBase: string;

  constructor(private readonly config: ConfigService) {
    this.uploadDir = config.get<string>(
      'KYC_UPLOAD_DIR',
      join(process.cwd(), 'uploads', 'kyc'),
    );

    this.publicBase = config.get<string>(
      'KYC_UPLOAD_URL',
      'http://localhost:3000/static/kyc',
    );

    if (!existsSync(this.uploadDir)) {
      mkdirSync(this.uploadDir, { recursive: true });
      this.logger.log(`Created KYC upload directory: ${this.uploadDir}`);
    }
  }

  async save(file: Express.Multer.File): Promise<KycUploadResult> {
    const rawExt = extname(file.originalname).toLowerCase();
    const ext    = this.sanitizeExtension(rawExt);

    if (!ALLOWED_EXTS.has(ext) || !ALLOWED_MIMETYPES.has(file.mimetype)) {
      throw new UnsupportedMediaTypeException(
        `Type de fichier non supporté: ${file.mimetype}. ` +
        `Acceptés : JPEG, PNG, WebP, PDF uniquement.`,
      );
    }

    if (file.size > MAX_SIZE_BYTES) {
      throw new BadRequestException(
        `Fichier trop volumineux (${Math.round(file.size / 1024)} Ko). Maximum : 10 Mo.`,
      );
    }

    const filename = `${uuidv4()}${ext}`;
    const destPath = resolve(join(this.uploadDir, filename));

    // Protection path traversal
    const safeBase = resolve(this.uploadDir);
    if (!destPath.startsWith(safeBase + sep) && destPath !== safeBase) {
      this.logger.error(`Path traversal detected: ${destPath}`);
      throw new BadRequestException('Nom de fichier invalide.');
    }

    if (file.path) {
      await rename(file.path, destPath);
    } else {
      await writeFile(destPath, file.buffer);
    }

    const url = `${this.publicBase}/${filename}`;
    this.logger.log(`KYC document saved: ${filename} · size=${file.size} bytes`);

    return {
      url,
      originalName: file.originalname,
      sizeBytes:    file.size,
      mimeType:     file.mimetype,
    };
  }

  private sanitizeExtension(ext: string): string {
    const clean = ext.replace(/[^a-z0-9]/g, '');
    if (clean.length === 0 || clean.length > 5) {
      throw new BadRequestException('Extension de fichier non valide.');
    }
    return `.${clean}`;
  }
}
