import {
  Injectable, NotFoundException, ConflictException, Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { City, CityStatus } from '../domain/entities/city.entity';
import { RedisService } from '../../../infrastructure/redis/redis.service';
import { CreateCityDto } from './dto/create-city.dto';
import { BroadcastService } from '../../notifications/application/broadcast.service';
import {
  NotificationCategory,
  NotificationChannel,
  NotificationPriority,
} from '../../notifications/domain/entities/notification.entity';

@Injectable()
export class CitiesService {
  private readonly logger    = new Logger(CitiesService.name);
  private readonly CACHE_KEY = 'cities:active';
  private readonly CACHE_TTL = 3600; // 1 heure

  constructor(
    @InjectRepository(City)
    private readonly repo: Repository<City>,
    private readonly redis: RedisService,
    private readonly broadcast: BroadcastService,
  ) {}

  async findAll(): Promise<City[]> {
    return this.redis.getOrSet(
      this.CACHE_KEY,
      () => this.repo.find({ where: { status: CityStatus.ACTIVE }, order: { name: 'ASC' } }),
      this.CACHE_TTL,
    );
  }

  /** Toutes les villes (tous statuts) — réservé admin */
  async findAllAdmin(): Promise<City[]> {
    return this.repo.find({ order: { name: 'ASC' } });
  }

  async findBySlug(slug: string): Promise<City | null> {
    return this.repo.findOne({ where: { slug } });
  }

  async findById(id: string): Promise<City | null> {
    return this.redis.getOrSet(
      `city:${id}`,
      () => this.repo.findOne({ where: { id } }),
      this.CACHE_TTL,
    );
  }

  /** [Super Admin] Créer une nouvelle ville */
  async create(dto: CreateCityDto): Promise<City> {
    const existing = await this.repo.findOne({ where: { slug: dto.slug } });
    if (existing) {
      throw new ConflictException(`Une ville avec le slug "${dto.slug}" existe déjà`);
    }

    const city = this.repo.create({
      name:        dto.name,
      slug:        dto.slug,
      countryCode: dto.countryCode ?? 'BF',
      currency:    dto.currency   ?? 'XOF',
      status:      dto.status     ?? CityStatus.ACTIVE,
      centerLat:   dto.centerLat,
      centerLng:   dto.centerLng,
      radiusKm:    dto.radiusKm   ?? 30,
    });

    const saved = await this.repo.save(city);
    await this.invalidateListCache();
    return saved;
  }

  /** [Super Admin] Activer une ville */
  async activate(id: string): Promise<City> {
    const city = await this.repo.findOne({ where: { id } });
    if (!city) throw new NotFoundException(`Ville introuvable : ${id}`);

    city.status = CityStatus.ACTIVE;
    const saved = await this.repo.save(city);
    await this.invalidateCityCache(id);
    return saved;
  }

  /** [Super Admin] Désactiver une ville (disparaît de la liste publique) */
  async deactivate(id: string, adminId: string, customMessage?: string): Promise<City> {
    const city = await this.repo.findOne({ where: { id } });
    if (!city) throw new NotFoundException(`Ville introuvable : ${id}`);

    city.status = CityStatus.INACTIVE;
    const saved = await this.repo.save(city);
    await this.invalidateCityCache(id);

    // Notifier tous les utilisateurs de la ville en arrière-plan
    void this.notifyCityDeactivated(city, adminId, customMessage);

    return saved;
  }

  /** [Super Admin] Supprimer définitivement une ville */
  async remove(id: string): Promise<void> {
    const city = await this.repo.findOne({ where: { id } });
    if (!city) throw new NotFoundException(`Ville introuvable : ${id}`);

    await this.repo.remove(city);
    await this.invalidateCityCache(id);
  }

  // ─── Notification helpers ─────────────────────────────────────────────────

  private async notifyCityDeactivated(
    city: City,
    adminId: string,
    customMessage?: string,
  ): Promise<void> {
    const body =
      customMessage?.trim() ||
      `Le service SuperApp n'est temporairement plus disponible à ${city.name}. Nous reviendrons bientôt !`;

    try {
      await this.broadcast.send({
        createdBy:    adminId,
        targetCityId: city.id,
        targetRole:   null,
        title:        `Service suspendu à ${city.name}`,
        body,
        channels:     [NotificationChannel.PUSH, NotificationChannel.IN_APP],
        category:     NotificationCategory.SYSTEM,
        priority:     NotificationPriority.HIGH,
        data: {
          type:   'city_deactivated',
          cityId: city.id,
          slug:   city.slug,
        },
      });
    } catch (err) {
      // Ne pas bloquer la désactivation si la notification échoue
      this.logger.error(`Broadcast city_deactivated échoué pour ${city.id}`, err);
    }
  }

  // ─── Cache helpers ────────────────────────────────────────────────────────

  private async invalidateListCache(): Promise<void> {
    await this.redis.del(this.CACHE_KEY);
  }

  private async invalidateCityCache(id: string): Promise<void> {
    await Promise.all([
      this.redis.del(this.CACHE_KEY),
      this.redis.del(`city:${id}`),
    ]);
  }
}
