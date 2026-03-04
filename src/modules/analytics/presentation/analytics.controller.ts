import { Controller, Get } from '@nestjs/common';
import {
  ApiTags, ApiBearerAuth, ApiOperation,
  ApiOkResponse, ApiUnauthorizedResponse, ApiForbiddenResponse,
} from '@nestjs/swagger';
import { AnalyticsService } from '../application/analytics.service';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { UnauthorizedDto, ForbiddenDto } from '../../../shared/dto/swagger-responses.dto';

@ApiTags('Analytics')
@ApiBearerAuth('access-token')
@Roles('super_admin', 'city_admin')
@Controller({ path: 'analytics', version: '1' })
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('metrics')
  @ApiOperation({
    summary: '[Admin] Métriques globales de la plateforme',
    description:
      'Retourne les indicateurs clés de la plateforme (KPIs) :\n\n' +
      '- **Rides** : courses totales / complétées / annulées, revenus\n' +
      '- **Users** : inscrits actifs, rétention 7j/30j\n' +
      '- **Drivers** : chauffeurs actifs, taux de disponibilité\n' +
      '- **Payments** : volume total, taux déchec mobile money\n' +
      '- **Food** : commandes / panier moyen\n' +
      '- **Delivery** : livraisons, délai moyen\n\n' +
      '> Données agrégées sur les 30 derniers jours. Mis à jour toutes les 5 minutes (Redis cache).',
  })
  @ApiOkResponse({
    schema: {
      example: {
        rides:    { total: 1250, completed: 1100, cancelled: 80, revenue: 12500000 },
        users:    { active: 3400, newThisWeek: 120 },
        drivers:  { active: 87, online: 34 },
        payments: { volume: 18750000, failureRate: 0.03 },
        food:     { orders: 450, avgBasket: 4500 },
        delivery: { total: 230, avgDeliveryMinutes: 28 },
      },
    },
  })
  @ApiUnauthorizedResponse({ type: UnauthorizedDto })
  @ApiForbiddenResponse({ type: ForbiddenDto })
  getMetrics() {
    return this.analyticsService.getMetrics();
  }
}
