import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Request } from 'express';

/**
 * SecurityInterceptor — détection d'injections SQL, XSS et path traversal.
 *
 * Inspecte les données entrantes (params, query, body) et bloque les payloads
 * clairement malveillants avant qu'ils n'atteignent les couches métier.
 *
 * Note : cet intercepteur est une première ligne de défense. Il ne remplace pas
 * les bonnes pratiques ORM (paramètres préparés) ni la validation de DTO.
 */
@Injectable()
export class SecurityInterceptor implements NestInterceptor {
  private readonly logger = new Logger(SecurityInterceptor.name);

  // ─── Patterns de détection ───────────────────────────────────────────────

  /** Injection SQL — mots-clés et constructions typiques */
  private readonly SQL_PATTERNS = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE|EXEC|EXECUTE|UNION|MERGE|CALL)\b)/gi,
    /(-{2}|\/\*|\*\/)/g,         // commentaires SQL
    /;\s*(DROP|DELETE|UPDATE)/gi, // chaînes destructrices
    /\b(OR|AND)\s+\d+=\d+/gi,    // tautologie classique (1=1)
    /'\s*(OR|AND)\s*'/gi,
  ];

  /** XSS — balises et handlers JS inline */
  private readonly XSS_PATTERNS = [
    /<\s*script[\s>]/gi,
    /<\s*\/\s*script\s*>/gi,
    /javascript\s*:/gi,
    /on\w+\s*=\s*["'`]/gi,       // onerror=, onclick=, …
    /<\s*(iframe|object|embed|link|meta)\b/gi,
    /data\s*:\s*text\/html/gi,
    /expression\s*\(/gi,          // CSS expression()
  ];

  /** Path Traversal */
  private readonly PATH_TRAVERSAL_PATTERNS = [
    /\.\.[/\\]/g,
    /%2e%2e[%2f%5c]/gi,
    /\.\.%2f/gi,
    /\.\.%5c/gi,
  ];

  // ─── Seuils de scoring ───────────────────────────────────────────────────
  // Une seule correspondance XSS ou Path Traversal = blocage immédiat.
  // Pour SQL, on tolère 0 correspondance (les requêtes légitimes ne devraient
  // jamais contenir ces mots-clés dans les champs utilisateur).
  private readonly BLOCK_THRESHOLD = 1;

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();

    // Passer les routes statiques et les uploads
    if (req.path.startsWith('/static')) {
      return next.handle();
    }

    const payload = this.collectPayload(req);

    const sqlHit     = this.scanPatterns(payload, this.SQL_PATTERNS);
    const xssHit     = this.scanPatterns(payload, this.XSS_PATTERNS);
    const traversalHit = this.scanPatterns(payload, this.PATH_TRAVERSAL_PATTERNS);

    if (
      sqlHit.count     >= this.BLOCK_THRESHOLD ||
      xssHit.count     >= this.BLOCK_THRESHOLD ||
      traversalHit.count >= this.BLOCK_THRESHOLD
    ) {
      const ip  = this.getClientIp(req);
      const uid = (req as Request & { user?: { id?: string } }).user?.id ?? 'anonymous';
      const threat = sqlHit.count > 0
        ? `SQL_INJECTION (${sqlHit.matched})`
        : xssHit.count > 0
          ? `XSS (${xssHit.matched})`
          : `PATH_TRAVERSAL (${traversalHit.matched})`;

      this.logger.warn(
        `[SECURITY] Blocked ${threat} — IP=${ip} UID=${uid} ${req.method} ${req.path}`,
      );

      throw new BadRequestException('Contenu de la requête invalide ou suspect.');
    }

    return next.handle();
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  /** Collecte toutes les valeurs textuelles (params, query, body) en une seule chaîne. */
  private collectPayload(req: Request): string {
    const parts: string[] = [];
    const push = (obj: unknown): void => {
      if (!obj) return;
      if (typeof obj === 'string') { parts.push(obj); return; }
      if (typeof obj === 'object') {
        for (const v of Object.values(obj as Record<string, unknown>)) {
          push(v);
        }
      }
    };
    push(req.params);
    push(req.query);
    push(req.body);
    return parts.join(' ');
  }

  private scanPatterns(
    text: string,
    patterns: RegExp[],
  ): { count: number; matched: string } {
    let count = 0;
    const matched: string[] = [];
    for (const p of patterns) {
      const m = text.match(p);
      if (m) {
        count += m.length;
        matched.push(m[0]);
      }
    }
    return { count, matched: matched.slice(0, 3).join(', ') };
  }

  private getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
    return req.ip ?? 'unknown';
  }
}
