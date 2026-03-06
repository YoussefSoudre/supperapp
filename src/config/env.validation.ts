import { plainToInstance } from 'class-transformer';
import {
  IsEnum, IsInt, IsOptional, IsString, Min, validateSync,
} from 'class-validator';

export enum NodeEnv {
  Development = 'development',
  Production  = 'production',
  Test        = 'test',
}

/**
 * Schéma de validation des variables d'environnement.
 * Toute variable manquante ou invalide provoque un crash au démarrage avec
 * un message clair — évite les erreurs silencieuses en production.
 */
class EnvironmentVariables {
  @IsEnum(NodeEnv)
  @IsOptional()
  NODE_ENV: NodeEnv = NodeEnv.Development;

  @IsInt()
  @Min(1)
  @IsOptional()
  PORT: number = 3000;

  // ─── Base de données ─────────────────────────────────────────────────────

  @IsString()
  DB_HOST: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  DB_PORT: number = 5432;

  @IsString()
  DB_USER: string;

  @IsString()
  DB_PASSWORD: string;

  @IsString()
  DB_NAME: string;

  // ─── Redis ───────────────────────────────────────────────────────────────

  @IsString()
  REDIS_HOST: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  REDIS_PORT: number = 6379;

  @IsString()
  @IsOptional()
  REDIS_PASSWORD?: string;

  // ─── JWT ─────────────────────────────────────────────────────────────────

  @IsString()
  JWT_SECRET: string;

  @IsString()
  @IsOptional()
  JWT_EXPIRES_IN: string = '7d';

  // ─── Notifications ───────────────────────────────────────────────────────

  @IsString()
  @IsOptional()
  SMS_PROVIDER?: string;

  @IsString()
  @IsOptional()
  TWILIO_ACCOUNT_SID?: string;

  @IsString()
  @IsOptional()
  TWILIO_AUTH_TOKEN?: string;

  @IsString()
  @IsOptional()
  TWILIO_FROM_NUMBER?: string;

  @IsString()
  @IsOptional()
  EMAIL_PROVIDER?: string;

  @IsString()
  @IsOptional()
  SMTP_HOST?: string;

  @IsInt()
  @IsOptional()
  SMTP_PORT?: number;

  @IsString()
  @IsOptional()
  SMTP_USER?: string;

  @IsString()
  @IsOptional()
  SMTP_PASS?: string;

  @IsString()
  @IsOptional()
  EMAIL_FROM?: string;

  // ─── CORS ────────────────────────────────────────────────────────────────

  @IsString()
  @IsOptional()
  ALLOWED_ORIGINS?: string;

  // ─── Bootstrap ────────────────────────────────────────────────────────────

  /** Clé utilisée pour POST /admin/rbac/bootstrap (premier super_admin) */
  @IsString()
  @IsOptional()
  BOOTSTRAP_SECRET?: string;
}

/**
 * Fonction de validation à passer à ConfigModule.forRoot({ validate }).
 * Lance une exception avec TOUS les champs invalides listés.
 */
export function validateEnv(config: Record<string, unknown>): EnvironmentVariables {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const messages = errors
      .map((e) => Object.values(e.constraints ?? {}).join(', '))
      .join('\n');
    throw new Error(`\n Invalid environment variables:\n${messages}\n`);
  }

  return validatedConfig;
}
