import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, HttpCode, HttpStatus, Req,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiBearerAuth,
  ApiOkResponse, ApiCreatedResponse,
  ApiNotFoundResponse, ApiConflictResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { Request } from 'express';
import { CitiesService } from '../application/cities.service';
import { CreateCityDto } from '../application/dto/create-city.dto';
import { DeactivateCityDto } from '../application/dto/deactivate-city.dto';
import { Public } from '../../../shared/decorators/public.decorator';
import { Roles } from '../../../shared/decorators/roles.decorator';

@ApiTags('Cities')
@Controller({ path: 'cities', version: '1' })
export class CitiesController {
  constructor(private readonly citiesService: CitiesService) {}

  // ─── Endpoints publics ──────────────────────────────────────────────────

  @Public()
  @Get()
  @ApiOperation({
    summary: 'Liste des villes actives (public)',
    description:
      'Retourne uniquement les villes dont le statut est **active**.\n\n' +
      'Aucune authentification requise. Utilisé lors de l\'onboarding pour choisir la ville.',
  })
  @ApiOkResponse({ schema: { example: [{ id: '550e8400-...001', name: 'Ouagadougou', slug: 'ouagadougou', status: 'active' }] } })
  findAll() {
    return this.citiesService.findAll();
  }

  @Public()
  @Get(':slug')
  @ApiOperation({
    summary: 'Détail d\'une ville par son slug (public)',
    description: 'Retourne la configuration de la ville : coordonnées GPS, rayon, devise.',
  })
  @ApiOkResponse({ schema: { example: { id: 'uuid', name: 'Ouagadougou', slug: 'ouagadougou' } } })
  @ApiNotFoundResponse({ description: 'Ville introuvable avec ce slug' })
  findBySlug(@Param('slug') slug: string) {
    return this.citiesService.findBySlug(slug);
  }

  // ─── Endpoints Super Admin ──────────────────────────────────────────────

  @Get('admin/all')
  @Roles('super_admin')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: '[Super Admin] Lister toutes les villes (tous statuts)',
    description:
      'Retourne **toutes** les villes (active, inactive, coming_soon).\n\n' +
      '> Accès réservé au rôle `super_admin`. Requiert un Bearer token JWT.',
  })
  @ApiOkResponse({ schema: { example: [{ id: 'uuid', name: 'Kaya', slug: 'kaya', status: 'inactive' }] } })
  findAllAdmin() {
    return this.citiesService.findAllAdmin();
  }

  @Post()
  @Roles('super_admin')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: '[Super Admin] Créer une nouvelle ville',
    description:
      'Crée une ville que les utilisateurs pourront sélectionner à l\'inscription.\n\n' +
      '- Le champ `slug` doit être unique (ex: `kaya`, `ouahigouya`).\n' +
      '- Le statut par défaut est `active` (visible dans la liste publique).\n' +
      '- Définissez `status: "coming_soon"` pour pré-créer une ville sans la rendre disponible.\n\n' +
      '> Accès réservé au rôle `super_admin`. Requiert un Bearer token JWT.',
  })
  @ApiCreatedResponse({ schema: { example: { id: 'uuid', name: 'Kaya', slug: 'kaya', status: 'active' } } })
  @ApiConflictResponse({ description: 'Un slug identique existe déjà' })
  @ApiForbiddenResponse({ description: 'Rôle super_admin requis' })
  create(@Body() dto: CreateCityDto) {
    return this.citiesService.create(dto);
  }

  @Patch(':id/activate')
  @Roles('super_admin')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: '[Super Admin] Activer une ville',
    description:
      'Passe le statut de la ville à **active** — elle apparaît dans la liste publique et les utilisateurs peuvent s\'y inscrire.\n\n' +
      '> Accès réservé au rôle `super_admin`. Requiert un Bearer token JWT.',
  })
  @ApiOkResponse({ schema: { example: { id: 'uuid', name: 'Kaya', status: 'active' } } })
  @ApiNotFoundResponse({ description: 'Ville introuvable' })
  activate(@Param('id') id: string) {
    return this.citiesService.activate(id);
  }

  @Patch(':id/deactivate')
  @Roles('super_admin')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: '[Super Admin] Désactiver une ville',
    description:
      'Passe le statut de la ville à **inactive** — elle disparaît immédiatement de la liste publique.\n\n' +
      'Une notification **PUSH + IN_APP** est envoyée automatiquement à tous les utilisateurs de la ville.\n\n' +
      '- Le champ `message` est **optionnel** : si absent, un message générique est utilisé.\n' +
      '- Les utilisateurs déjà inscrits dans cette ville ne sont **pas** supprimés.\n\n' +
      '> Accès réservé au rôle `super_admin`. Requiert un Bearer token JWT.',
  })
  @ApiOkResponse({ schema: { example: { id: 'uuid', name: 'Kaya', status: 'inactive' } } })
  @ApiNotFoundResponse({ description: 'Ville introuvable' })
  deactivate(
    @Param('id') id: string,
    @Body() dto: DeactivateCityDto,
    @Req() req: Request,
  ) {
    const adminId = (req.user as { id: string }).id;
    return this.citiesService.deactivate(id, adminId, dto.message);
  }

  @Delete(':id')
  @Roles('super_admin')
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: '[Super Admin] Supprimer définitivement une ville',
    description:
      '⚠️ **Suppression irréversible.** Retire la ville de la base de données.\n\n' +
      'Désactivez d\'abord la ville si des utilisateurs y sont encore rattachés.\n\n' +
      '> Accès réservé au rôle `super_admin`. Requiert un Bearer token JWT.',
  })
  @ApiOkResponse({ description: 'Ville supprimée (204 No Content)' })
  @ApiNotFoundResponse({ description: 'Ville introuvable' })
  remove(@Param('id') id: string) {
    return this.citiesService.remove(id);
  }
}
