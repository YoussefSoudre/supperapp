import { Controller, Get, Post, Body, Request, Query } from '@nestjs/common';
import {
  ApiTags, ApiBearerAuth, ApiOperation,
  ApiCreatedResponse, ApiOkResponse,
  ApiBadRequestResponse, ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { DeliveryService } from '../application/delivery.service';
import { DeliveryFilterDto } from './dto/delivery-filter.dto';
import { DeliveryResponseDto, ValidationErrorDto, UnauthorizedDto } from '../../../shared/dto/swagger-responses.dto';

@ApiTags('Delivery')
@ApiBearerAuth('access-token')
@Controller({ path: 'delivery', version: '1' })
export class DeliveryController {
  constructor(private readonly deliveryService: DeliveryService) {}

  @Post()
  @ApiOperation({
    summary: 'Créer une livraison de colis',
    description:
      'Crée une livraison et lance la recherche d\'un chauffeur disponible.\n\n' +
      'Champs attendus dans le body :\n' +
      '- `pickupAddress`, `pickupLat`, `pickupLng`\n' +
      '- `dropoffAddress`, `dropoffLat`, `dropoffLng`\n' +
      '- `packageSize` : `small` (<5kg) | `medium` (5-20kg) | `large` (>20kg)\n' +
      '- `description` : description optionnelle du colis',
  })
  @ApiCreatedResponse({ type: DeliveryResponseDto, description: 'Livraison créée' })
  @ApiBadRequestResponse({ type: ValidationErrorDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedDto })
  create(@Request() req: { user: { id: string; cityId: string } }, @Body() body: any) {
    return this.deliveryService.create({ ...body, senderId: req.user.id, cityId: req.user.cityId });
  }

  @Get()
  @ApiOperation({
    summary: 'Mes livraisons (paginées + filtrées)',
    description:
      '**Filtres standards** : `page`, `limit`, `sortBy` (createdAt|price), `sortOrder`, `dateFrom`, `dateTo`\n\n' +
      '**Filtres avancés** : `status` (un ou plusieurs), `packageSize` (small|medium|large)',
  })
  @ApiOkResponse({ description: 'Liste paginée de livraisons', schema: { example: { data: [], total: 15, page: 1, limit: 20, totalPages: 1 } } })
  @ApiUnauthorizedResponse({ type: UnauthorizedDto })
  findMine(
    @Request() req: { user: { id: string } },
    @Query() filters: DeliveryFilterDto,
  ) {
    return this.deliveryService.findBySenderId(req.user.id, filters);
  }
}
