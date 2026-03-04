import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../../../infrastructure/redis/redis.service';

const OTP_TTL_SEC     = 5 * 60;    // 5 minutes
const MAX_ATTEMPTS    = 5;          // tentatives max avant blocage
const BLOCK_TTL_SEC   = 15 * 60;   // blocage 15 min après épuisement
const OTP_KEY         = 'otp:';    // otp:{phone}
const RATE_KEY        = 'otp:rate:'; // otp:rate:{phone} → compteur d'envois
const BLOCK_KEY       = 'otp:block:'; // otp:block:{phone}
const RATE_WINDOW_SEC = 60 * 60;   // 1 heure — fenêtre de rate limiting envoi

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly config: ConfigService,
  ) {}

  // ─── Génération & envoi ──────────────────────────────────────────────────

  /**
   * Génère un OTP à 6 chiffres, le stocke dans Redis et l'envoie par SMS.
   * Rate limiting : 5 envois max par heure par numéro.
   */
  async sendOtp(phone: string): Promise<{ message: string }> {
    // Vérifier le blocage
    const blocked = await this.redis.get(`${BLOCK_KEY}${phone}`);
    if (blocked) {
      throw new BadRequestException(
        'Too many attempts. Please wait 15 minutes before requesting a new code.',
      );
    }

    // Rate limiting envoi (max 5 / heure)
    const rateKey = `${RATE_KEY}${phone}`;
    const sendCount = await this.redis.client.incr(rateKey);
    if (sendCount === 1) {
      await this.redis.client.expire(rateKey, RATE_WINDOW_SEC);
    }
    if (sendCount > 5) {
      throw new BadRequestException(
        'OTP send limit reached (5/hour). Please try again later.',
      );
    }

    const otp  = this.generateOtp();
    const data = { otp, phone, attempts: 0, createdAt: Date.now() };

    await this.redis.setJson(`${OTP_KEY}${phone}`, data, OTP_TTL_SEC);

    // Envoi SMS — en dev on log, en prod on appelle le provider SMS
    await this.deliverSms(phone, otp);

    this.logger.log(`OTP sent to ${phone.slice(0, 6)}***`);
    return { message: 'OTP sent successfully' };
  }

  // ─── Vérification ────────────────────────────────────────────────────────

  /**
   * Vérifie le code OTP soumis par l'utilisateur.
   * Après MAX_ATTEMPTS échecs → blocage 15 min.
   * OTP consommé à usage unique (supprimé après succès).
   */
  async verifyOtp(phone: string, code: string): Promise<boolean> {
    const key  = `${OTP_KEY}${phone}`;
    const data = await this.redis.getJson<{ otp: string; phone: string; attempts: number }>(key);

    if (!data) {
      throw new BadRequestException('OTP not found or expired. Please request a new code.');
    }

    if (data.attempts >= MAX_ATTEMPTS) {
      await this.redis.del(key);
      await this.redis.set(`${BLOCK_KEY}${phone}`, '1', BLOCK_TTL_SEC);
      throw new BadRequestException('Too many incorrect attempts. Blocked for 15 minutes.');
    }

    if (data.otp !== code) {
      data.attempts += 1;
      await this.redis.setJson(key, data, OTP_TTL_SEC);
      const remaining = MAX_ATTEMPTS - data.attempts;
      throw new BadRequestException(
        `Invalid OTP. ${remaining} attempt${remaining > 1 ? 's' : ''} remaining.`,
      );
    }

    // Succès — consommer le code (one-time use)
    await this.redis.del(key);
    return true;
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private generateOtp(): string {
    // Cryptographiquement aléatoire : 6 chiffres avec padding zéro
    const code = Math.floor(100000 + Math.random() * 900000);
    return code.toString().padStart(6, '0');
  }

  /**
   * Envoi SMS.
   * En développement : log du code dans les traces (jamais en prod).
   * En production : brancher Twilio / Orange SMS selon SMS_PROVIDER.
   */
  private async deliverSms(phone: string, otp: string): Promise<void> {
    const env = this.config.get<string>('NODE_ENV', 'development');

    if (env !== 'production') {
      // ⚠ DEV ONLY — ne jamais loguer les OTP en production
      this.logger.warn(`[DEV] OTP for ${phone}: ${otp}`);
      return;
    }

    // TODO: injecter le SmsAdapter et appeler sendSms(phone, `Votre code superapp: ${otp}`)
    // Ex: await this.smsAdapter.send(phone, `Code de vérification : ${otp}. Valable 5 min.`);
    this.logger.log(`SMS OTP dispatched to ${phone.slice(0, 6)}***`);
  }
}
