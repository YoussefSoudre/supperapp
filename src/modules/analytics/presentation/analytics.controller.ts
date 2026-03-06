import { Controller, Get, Query, Request } from '@nestjs/common';
import {
  ApiTags, ApiBearerAuth, ApiOperation,
  ApiOkResponse, ApiUnauthorizedResponse, ApiForbiddenResponse, ApiQuery,
} from '@nestjs/swagger';
import { AnalyticsService } from '../application/analytics.service';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { UnauthorizedDto, ForbiddenDto } from '../../../shared/dto/swagger-responses.dto';

@ApiTags('Analytics')
@ApiBearerAuth('access-token')
@Controller({ path: 'analytics', version: '1' })
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  // ─── Super Admin — global metrics ────────────────────────────────────────

  @Get('metrics')
  @Roles('super_admin')
  @ApiOperation({
    summary: '[Super Admin] Métriques globales — toutes les villes',
    description:
      'Retourne les KPIs agrégés sur **toutes les villes** (30 derniers jours).\n\n' +
      '> 🔑 **Authentification** : envoyer uniquement le header `Authorization: Bearer <token>`.\n' +
      '> L\'identité de l\'utilisateur connecté est extraite automatiquement du JWT — aucun paramètre `userId` à fournir.\n\n' +
      '**Métriques retournées** :\n' +
      '- **Rides** : total / complétées / annulées / revenus (XOF)\n' +
      '- **Drivers** : répartition par statut, note moyenne\n' +
      '- **Users** : total, nouveaux 7j/30j, KYC en attente\n' +
      '- **Deliveries** : total / livrées / revenus\n' +
      '- **Food** : commandes / livrées / revenus / panier moyen\n' +
      '- **Payments** : volume total, taux d\'échec\n\n' +
      '> Accès réservé au `super_admin` uniquement.\n' +
      '> `finance` et `analyste` utilisent `GET /city-metrics` — scopé à leurs villes assignées.',
  })
  @ApiOkResponse({
    schema: {
      example: {
        rides:     { total: 3200, completed: 2900, cancelled: 210, revenue: 32000000 },
        drivers:   { byStatus: { active: 140, online: 42, on_trip: 18, pending_approval: 7, suspended: 3, offline: 50 }, total: 260, avgRating: 4.62 },
        users:     { total: 8400, new7d: 320, new30d: 980, kycPending: 145 },
        deliveries:{ total: 620, delivered: 540, cancelled: 44, revenue: 4960000 },
        food:      { total: 1180, delivered: 1040, cancelled: 88, revenue: 6200000, avgBasket: 5254 },
        payments:  { volume: 43160000, total: 4980, failureRate: 0.0284 },
        period: '30d', scope: 'global',
      },
    },
  })
  @ApiUnauthorizedResponse({ type: UnauthorizedDto })
  @ApiForbiddenResponse({ type: ForbiddenDto })
  getGlobalMetrics() {
    return this.analyticsService.getGlobalMetrics();
  }

  // ─── City Admin — city-scoped metrics ────────────────────────────────────

  @Get('city-metrics')
  @Roles('super_admin', 'city_admin', 'finance', 'analyste')
  @ApiOperation({
    summary: '[City Admin / Finance / Analyste] Statistiques de la ville (30 jours)',
    description:
      'Retourne les KPIs des **30 derniers jours** pour les villes rattachées à l\'utilisateur connecté.\n\n' +
      '> 🔑 **Authentification** : envoyer uniquement le header `Authorization: Bearer <token>`.\n' +
      '> L\'identité et les villes associées sont extraites automatiquement du JWT — **aucun `userId` à fournir**.\n\n' +
      '**Scoping automatique selon le rôle** :\n' +
      '- `city_admin` / `finance` / `analyste` → **uniquement les villes auxquelles ils sont rattachés** (assignées par le super_admin)\n' +
      '- `super_admin` → toutes les villes\n\n' +
      '**Filtrage optionnel** :\n' +
      '- `?cityId=<uuid>` → restreindre à une ville précise. Si le `cityId` passé ne fait pas partie\n' +
      '  des villes autorisées pour ce rôle, le serveur retourne **403 Forbidden** automatiquement.\n\n' +
      '**Métriques** :\n' +
      '- Courses : total, complétées, annulées, revenus (XOF)\n' +
      '- Chauffeurs : répartition par statut, note moyenne\n' +
      '- Utilisateurs : total, nouveaux 7j/30j, KYC en attente\n' +
      '- Livraisons colis : total, livrées, revenus\n' +
      '- Food & Resto : commandes, livrées, revenus, panier moyen',
  })
  @ApiQuery({ name: 'cityId', required: false, description: 'Filtrer sur une ville spécifique (UUID). Optionnel.' })
  @ApiOkResponse({
    schema: {
      example: {
        rides:      { total: 540, completed: 490, cancelled: 36, revenue: 5400000 },
        drivers:    { byStatus: { active: 32, online: 11, on_trip: 5, pending_approval: 2, suspended: 1, offline: 14 }, total: 65, avgRating: 4.71 },
        users:      { total: 1820, new7d: 68, new30d: 210, kycPending: 34 },
        deliveries: { total: 148, delivered: 130, cancelled: 10, revenue: 1184000 },
        food:       { total: 285, delivered: 254, cancelled: 18, revenue: 1425000, avgBasket: 5000 },
        period: '30d', cityIds: ['uuid-city-here'],
      },
    },
  })
  @ApiUnauthorizedResponse({ type: UnauthorizedDto })
  @ApiForbiddenResponse({ type: ForbiddenDto })
  getCityMetrics(
    @Request() req: { user: { id: string } },
    @Query('cityId') cityId?: string,
  ) {
    return this.analyticsService.getCityMetrics(req.user.id, cityId);
  }

  // ─── Manager — operational metrics ───────────────────────────────────────

  @Get('manager-metrics')
  @Roles('super_admin', 'city_admin', 'manager')
  @ApiOperation({
    summary: '[Manager] Statistiques opérationnelles (aujourd\'hui / 7 jours)',
    description:
      'Retourne les **indicateurs opérationnels en temps réel** pour les villes gérées par l\'utilisateur connecté.\n\n' +
      '> 🔑 **Authentification** : envoyer uniquement le header `Authorization: Bearer <token>`.\n' +
      '> L\'identité et les villes rattachées sont extraites automatiquement du JWT — **aucun `userId` à fournir**.\n\n' +
      '**Scoping automatique selon le rôle** :\n' +
      '- `manager` → uniquement les données de **sa ville** (assignée par le city_admin)\n' +
      '- `city_admin` → uniquement ses villes\n' +
      '- `super_admin` → toutes les villes\n\n' +
      '**Filtrage optionnel** :\n' +
      '- `?cityId=<uuid>` → restreindre à une ville précise (doit être dans le scope du rôle,\n' +
      '  sinon **403 Forbidden**).\n\n' +
      '**Métriques retournées** :\n' +
      '- **ridesToday** : courses du jour (total, complétées, annulées, en cours)\n' +
      '- **rides7d** : courses des 7 derniers jours\n' +
      '- **driversLive** : chauffeurs actifs maintenant (lastSeen < 15 min), par statut, approbations en attente\n' +
      '- **deliveriesToday** : livraisons du jour (pending, en transit, livrées)\n' +
      '- **foodToday** : commandes food du jour (en attente, en préparation, livrées)',
  })
  @ApiQuery({ name: 'cityId', required: false, description: 'Filtrer sur une ville spécifique (UUID). Optionnel.' })
  @ApiOkResponse({
    schema: {
      example: {
        ridesToday:     { total: 48, completed: 40, cancelled: 4, active: 4 },
        rides7d:        { total: 310, completed: 280, cancelled: 22, active: 0 },
        driversLive:    { byStatus: { active: 32, online: 11, on_trip: 5, offline: 14 }, total: 65, activeNow: 16, pendingApproval: 2 },
        deliveriesToday:{ total: 22, delivered: 15, pending: 3, inProgress: 4 },
        foodToday:      { total: 34, delivered: 20, pending: 6, preparing: 8 },
        cityIds: ['uuid-city-here'],
      },
    },
  })
  @ApiUnauthorizedResponse({ type: UnauthorizedDto })
  @ApiForbiddenResponse({ type: ForbiddenDto })
  getManagerMetrics(
    @Request() req: { user: { id: string } },
    @Query('cityId') cityId?: string,
  ) {
    return this.analyticsService.getManagerMetrics(req.user.id, cityId);
  }
}
