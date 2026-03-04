import { Controller, Get, Patch, Body, Request, ParseUUIDPipe, Param, Query } from '@nestjs/common';
import {
  ApiTags, ApiBearerAuth, ApiOperation,
  ApiOkResponse, ApiNotFoundResponse, ApiUnauthorizedResponse, ApiBadRequestResponse, ApiParam,
} from '@nestjs/swagger';
import { UsersService } from '../application/users.service';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { UserFilterDto } from './dto/user-filter.dto';
import { UserPublicDto, NotFoundDto, UnauthorizedDto, ValidationErrorDto } from '../../../shared/dto/swagger-responses.dto';

@ApiTags('Users')
@ApiBearerAuth('access-token')
@Controller({ path: 'users', version: '1' })
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Mon profil utilisateur', description: 'Retourne le profil complet de l\'utilisateur connecté.' })
  @ApiOkResponse({ type: UserPublicDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedDto })
  getMe(@Request() req: { user: { id: string } }) {
    return this.usersService.findById(req.user.id);
  }

  @Patch('me')
  @ApiOperation({
    summary: 'Mettre à jour mon profil',
    description: 'Champs modifiables : `firstName`, `lastName`, `email`, `avatarUrl`.',
  })
  @ApiOkResponse({ type: UserPublicDto })
  @ApiBadRequestResponse({ type: ValidationErrorDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedDto })
  updateMe(
    @Request() req: { user: { id: string } },
    @Body() data: Partial<{ firstName: string; lastName: string; email: string; avatarUrl: string }>,
  ) {
    return this.usersService.update(req.user.id, data);
  }

  @Patch('me/fcm-token')
  @ApiOperation({
    summary: 'Enregistrer / mettre à jour le token FCM',
    description: 'Utilisé par le client mobile pour recevoir les notifications push via Firebase Cloud Messaging.',
  })
  @ApiOkResponse({ schema: { example: { updated: true } } })
  @ApiUnauthorizedResponse({ type: UnauthorizedDto })
  updateFcmToken(
    @Request() req: { user: { id: string } },
    @Body('fcmToken') fcmToken: string,
  ) {
    return this.usersService.updateFcmToken(req.user.id, fcmToken);
  }

  // ─── Admin ─────────────────────────────────────────────────────────────────

  @Get()
  @Roles('super_admin', 'city_admin')
  @ApiOperation({
    summary: '[Admin] Liste paginée et filtrée des utilisateurs',
    description:
      '**Filtres standards** : `page`, `limit`, `sortBy` (createdAt|firstName|lastName), `sortOrder`, ' +
      '`dateFrom`, `dateTo`, `search` (prénom/nom/email/téléphone)\n\n' +
      '**Filtres avancés** : `status` (active|inactive|suspended|pending_kyc), `cityId`, ' +
      '`phoneVerified`, `kycVerified`',
  })
  @ApiOkResponse({ description: 'Liste paginée d\'utilisateurs', schema: { example: { data: [], total: 1200, page: 1, limit: 20, totalPages: 60 } } })
  @ApiUnauthorizedResponse({ type: UnauthorizedDto })
  findAll(@Query() filters: UserFilterDto) {
    return this.usersService.findAll(filters);
  }

  @Get(':id')
  @Roles('super_admin', 'city_admin')
  @ApiParam({ name: 'id', description: 'UUID de l\'utilisateur' })
  @ApiOperation({ summary: '[Admin] Détail d\'un utilisateur par ID' })
  @ApiOkResponse({ type: UserPublicDto })
  @ApiNotFoundResponse({ type: NotFoundDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedDto })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findById(id);
  }
}
