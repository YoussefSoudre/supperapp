import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import {
  ApiTags, ApiBearerAuth, ApiOperation,
  ApiOkResponse, ApiCreatedResponse, ApiNotFoundResponse, ApiUnauthorizedResponse, ApiForbiddenResponse, ApiParam,
} from '@nestjs/swagger';
import { AdminService } from '../application/admin.service';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { ForbiddenDto, NotFoundDto, UnauthorizedDto } from '../../../shared/dto/swagger-responses.dto';

@ApiTags('Admin')
@ApiBearerAuth('access-token')
@Roles('super_admin', 'city_admin')
@Controller({ path: 'admin', version: '1' })
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('roles')
  @ApiOperation({
    summary: '[Admin] Lister tous les rôles RBAC',
    description: 'Retourne la liste des rôles disponibles dans le système : `super_admin`, `city_admin`, `support`, `driver`, `user`.',
  })
  @ApiOkResponse({ schema: { example: { data: [{ id: 'uuid', name: 'super_admin', description: 'Super administrateur' }] } } })
  @ApiUnauthorizedResponse({ type: UnauthorizedDto })
  @ApiForbiddenResponse({ type: ForbiddenDto })
  getRoles() {
    return this.adminService.getRoles();
  }

  @Post('users/:userId/roles')
  @ApiParam({ name: 'userId', description: 'UUID de l\'utilisateur à modifier' })
  @ApiOperation({
    summary: '[Admin] Assigner un rôle à un utilisateur',
    description:
      'Body attendu : `{ roleId, grantedBy, cityId? }`\n\n' +
      '- `roleId` : UUID du rôle\n' +
      '- `grantedBy` : UUID de l\'admin accordant le rôle\n' +
      '- `cityId` : (optionnel) restreint le rôle à une ville spécifique',
  })
  @ApiCreatedResponse({ schema: { example: { userId: 'uuid', roleId: 'uuid', cityId: null, grantedAt: '2025-01-01T00:00:00Z' } } })
  @ApiNotFoundResponse({ type: NotFoundDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedDto })
  @ApiForbiddenResponse({ type: ForbiddenDto })
  assignRole(
    @Param('userId') userId: string,
    @Body() body: { roleId: string; grantedBy: string; cityId?: string },
  ) {
    return this.adminService.assignRole(userId, body.roleId, body.grantedBy, body.cityId);
  }

  @Get('users/:userId/roles')
  @ApiParam({ name: 'userId', description: 'UUID de l\'utilisateur' })
  @ApiOperation({ summary: '[Admin] Rôles d\'un utilisateur', description: 'Liste tous les rôles assignés à cet utilisateur (avec villes associées si applicable).' })
  @ApiOkResponse({ schema: { example: { data: [{ role: 'city_admin', cityId: 'uuid', grantedAt: '2025-01-01T00:00:00Z' }] } } })
  @ApiNotFoundResponse({ type: NotFoundDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedDto })
  @ApiForbiddenResponse({ type: ForbiddenDto })
  getUserRoles(@Param('userId') userId: string) {
    return this.adminService.getUserRoles(userId);
  }
}
