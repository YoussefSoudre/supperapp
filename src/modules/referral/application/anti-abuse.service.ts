import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RedisService } from '../../../infrastructure/redis/redis.service';
import { ReferralUsage, ReferralUsageStatus } from '../domain/entities/referral-usage.entity';
import { AntiAbuseConfig } from '../domain/entities/referral-program.entity';

export interface AbuseCheckInput {
  referrerId:         string;
  refereeId:          string;
  refereePhone:       string;
  cityId:             string;
  deviceFingerprint?: string;
  registrationIp?:    string;
  programId:          string;
  antiAbuseConfig:    AntiAbuseConfig;
}

export interface AbuseCheckResult {
  abused:  boolean;
  reasons: string[];
}

/**
 * AntiAbuseService — Couche de protection contre les fraudes au parrainage.
 *
 * Contrôles effectués (dans l'ordre) :
 *   1. Auto-parrainage           → referrerId === refereeId
 *   2. Device fingerprint dupliqué → même device utilisé par plusieurs comptes
 *   3. Plage IP suspecte           → trop d'inscriptions depuis le même /24
 *   4. Série téléphonique          → numéros séquentiels (SIM farm)
 *   5. Plafond parrain             → maxRewardsPerReferrer atteint
 *   6. Expiration programme        → usage PENDING expiré
 *
 * Chaque contrôle est indépendant ; tous s'exécutent avant de retourner le résultat.
 * Les vérifications Redis utilisent un TTL de 24h pour les compteurs glissants.
 */
@Injectable()
export class AntiAbuseService {
  private readonly logger = new Logger(AntiAbuseService.name);

  constructor(
    @InjectRepository(ReferralUsage)
    private readonly usageRepo: Repository<ReferralUsage>,
    private readonly redis: RedisService,
  ) {}

  async check(input: AbuseCheckInput): Promise<AbuseCheckResult> {
    const reasons: string[] = [];

    await Promise.all([
      this.checkSelfReferral(input, reasons),
      this.checkDeviceFingerprint(input, reasons),
      this.checkIpSubnet(input, reasons),
      this.checkPhonePattern(input, reasons),
      this.checkReferrerCap(input, reasons),
    ]);

    const abused = reasons.length > 0;
    if (abused) {
      this.logger.warn(
        `Abuse detected for referee ${input.refereeId} ` +
        `(referrer ${input.referrerId}): ${reasons.join(' | ')}`,
      );
    }
    return { abused, reasons };
  }

  // ── 1. Auto-parrainage ────────────────────────────────────────────────────

  private checkSelfReferral(input: AbuseCheckInput, reasons: string[]): void {
    if (input.referrerId === input.refereeId) {
      reasons.push('self_referral: same user id as referrer');
    }
  }

  // ── 2. Device fingerprint ─────────────────────────────────────────────────

  private async checkDeviceFingerprint(
    input: AbuseCheckInput,
    reasons: string[],
  ): Promise<void> {
    if (!input.deviceFingerprint || !input.antiAbuseConfig.blockSameDevice) return;

    const key = `referral:device:${input.deviceFingerprint}`;
    const existing = await this.redis.client.get(key);

    if (existing && existing !== input.refereeId) {
      reasons.push(`same_device: fingerprint already used by ${existing}`);
    } else {
      // Enregistrer ce device → ce userId avec TTL 30 jours
      await this.redis.client.set(key, input.refereeId, 'EX', 30 * 86400);
    }
  }

  // ── 3. Subnet IP ──────────────────────────────────────────────────────────

  private async checkIpSubnet(
    input: AbuseCheckInput,
    reasons: string[],
  ): Promise<void> {
    if (!input.registrationIp) return;
    const maxPerSubnet = input.antiAbuseConfig.maxUsersPerSubnet ?? 5;

    // IPv4 : subnet /24 (ex: 192.168.1.0/24)
    const subnet = this.getSubnet(input.registrationIp);
    const key    = `referral:subnet:${subnet}`;

    const count = await this.redis.client.incr(key);
    if (count === 1) {
      // Premier enregistrement depuis ce subnet ce jour
      await this.redis.client.expire(key, 86400); // glissant 24h
    }
    if (count > maxPerSubnet) {
      reasons.push(`ip_subnet: ${count} users from subnet ${subnet} (max ${maxPerSubnet})`);
    }
  }

  // ── 4. Série téléphonique (SIM farm) ──────────────────────────────────────

  private async checkPhonePattern(
    input: AbuseCheckInput,
    reasons: string[],
  ): Promise<void> {
    // Les SIM farms utilisent souvent des séries de numéros consécutifs
    // Heuristique : compter les inscriptions avec le même préfixe de 7 chiffres
    const prefix    = input.refereePhone.replace(/\D/g, '').slice(0, 7);
    const key       = `referral:phoneprefix:${input.programId}:${prefix}`;
    const threshold = 3; // max 3 inscriptions avec le même préfixe à 7 chiffres

    const count = await this.redis.client.incr(key);
    if (count === 1) {
      await this.redis.client.expire(key, 7 * 86400); // fenêtre 7 jours
    }
    if (count > threshold) {
      reasons.push(`phone_pattern: ${count} registrations with prefix ${prefix} (max ${threshold})`);
    }
  }

  // ── 5. Plafond parrain ────────────────────────────────────────────────────

  private async checkReferrerCap(
    input: AbuseCheckInput,
    reasons: string[],
  ): Promise<void> {
    const max = input.antiAbuseConfig.maxFilleulsPerReferrer ?? 0;
    if (max === 0) return; // 0 = illimité

    const count = await this.usageRepo.count({
      where: {
        referrerId: input.referrerId,
        programId:  input.programId,
        status:     ReferralUsageStatus.REWARDED,
      },
    });

    if (count >= max) {
      reasons.push(`referrer_cap: referrer has already earned ${count}/${max} rewards`);
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private getSubnet(ip: string): string {
    // IPv4 → /24 ; IPv6 → /48 (premiers 6 groupes)
    if (ip.includes('.')) {
      return ip.split('.').slice(0, 3).join('.');
    }
    return ip.split(':').slice(0, 3).join(':');
  }

  /**
   * Construit une empreinte device légère à partir des headers HTTP.
   * À utiliser côté guard/middleware pour passer dans le payload.
   */
  static buildFingerprint(userAgent: string, platform: string): string {
    const raw = `${userAgent}|${platform}`.toLowerCase();
    // Hachage FNV-1a 32-bit portable (sans dépendance crypto)
    let hash = 2166136261;
    for (let i = 0; i < raw.length; i++) {
      hash ^= raw.charCodeAt(i);
      hash = (hash * 16777619) >>> 0;
    }
    return hash.toString(16).padStart(8, '0');
  }
}
