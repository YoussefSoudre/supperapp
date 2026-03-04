import { Controller, Get, Post, Body, Request, Query } from '@nestjs/common';
import {
  ApiTags, ApiBearerAuth, ApiOperation,
  ApiCreatedResponse, ApiOkResponse,
  ApiBadRequestResponse, ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { FoodService } from '../application/food.service';
import { Public } from '../../../shared/decorators/public.decorator';
import { FoodOrderFilterDto, RestaurantFilterDto } from './dto/food-filter.dto';
import { ValidationErrorDto, UnauthorizedDto } from '../../../shared/dto/swagger-responses.dto';

@ApiTags('Food')
@ApiBearerAuth('access-token')
@Controller({ path: 'food', version: '1' })
export class FoodController {
  constructor(private readonly foodService: FoodService) {}

  @Public()
  @Get('restaurants')
  @ApiOperation({
    summary: 'Liste des restaurants (public, paginée + filtrée)',
    description:
      'Accessible sans authentification. \n\n' +
      '**Filtres standards** : `page`, `limit`, `sortBy` (rating|name|createdAt), `sortOrder`, `search` (nom du restaurant)\n\n' +
      '**Filtres avancés** : `cityId`, `category` (Burgers, Africain, Pizza…), `isActive` (défaut: true)',
  })
  @ApiOkResponse({
    description: 'Liste paginée de restaurants',
    schema: { example: { data: [], total: 24, page: 1, limit: 20, totalPages: 2 } },
  })
  getRestaurants(@Query() filters: RestaurantFilterDto) {
    return this.foodService.getRestaurants(filters);
  }

  @Post('orders')
  @ApiOperation({
    summary: 'Passer une commande food',
    description:
      'Crée une commande auprès d\'un restaurant.\n\n' +
      'Champs attendus :\n' +
      '- `restaurantId` : UUID du restaurant\n' +
      '- `items` : tableau d\'articles `[{ menuItemId, quantity }]`\n' +
      '- `deliveryAddress` : adresse de livraison\n' +
      '- `paymentMethod` : `wallet` | `orange_money` | `moov_money` | `cash`',
  })
  @ApiCreatedResponse({ description: 'Commande créée avec statut `pending`' })
  @ApiBadRequestResponse({ type: ValidationErrorDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedDto })
  placeOrder(@Request() req: { user: { id: string; cityId: string } }, @Body() body: any) {
    return this.foodService.placeOrder(req.user.id, req.user.cityId, body);
  }

  @Get('orders')
  @ApiOperation({
    summary: 'Mes commandes food (paginées + filtrées)',
    description:
      '**Filtres standards** : `page`, `limit`, `sortBy` (createdAt|total), `sortOrder`, `dateFrom`, `dateTo`\n\n' +
      '**Filtres avancés** : `status` (pending|confirmed|preparing|ready_for_pickup|picked_up|delivered|cancelled), `restaurantId`',
  })
  @ApiOkResponse({ description: 'Liste paginée de commandes', schema: { example: { data: [], total: 30, page: 1, limit: 20, totalPages: 2 } } })
  @ApiUnauthorizedResponse({ type: UnauthorizedDto })
  getOrders(
    @Request() req: { user: { id: string } },
    @Query() filters: FoodOrderFilterDto,
  ) {
    return this.foodService.getOrders(req.user.id, filters);
  }
}
