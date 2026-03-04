import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

const IS_PROD = process.env.NODE_ENV === 'production';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request  = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const isServerError = status >= 500;

    // ── Logging ────────────────────────────────────────────────────────────
    if (isServerError) {
      // En production : log complet côté serveur, jamais exposé au client
      this.logger.error(
        `${request.method} ${request.url} — ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else {
      // 4xx : log léger (warn), pas de stack trace
      this.logger.warn(`${request.method} ${request.url} — ${status}`);
    }

    // ── Message renvoyé au client ──────────────────────────────────────────
    let message: unknown;

    if (exception instanceof HttpException) {
      const raw = exception.getResponse();
      if (isServerError && IS_PROD) {
        // Ne jamais exposer les détails d'erreur 5xx en production
        message = 'Une erreur interne est survenue. Veuillez réessayer.';
      } else {
        message = raw;
      }
    } else {
      // Erreur non-HTTP (ex: crash TypeORM) — masquer en prod
      message = IS_PROD
        ? 'Une erreur interne est survenue. Veuillez réessayer.'
        : (exception instanceof Error ? exception.message : 'Internal server error');
    }

    response.status(status).json({
      success:    false,
      statusCode: status,
      message,
      path:       request.url,
      timestamp:  new Date().toISOString(),
    });
  }
}
