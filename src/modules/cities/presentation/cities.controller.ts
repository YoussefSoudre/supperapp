import { Controller, Get, Param } from '@nestjs/common';
import {
  ApiTags, ApiOperation,
  ApiOkResponse, ApiNotFoundResponse,
} from '@nestjs/swagger';
import { CitiesService } from '../application/cities.service';
import { Public } from '../../../shared/decorators/public.decorator';

@ApiTags('Cities')
@Controller({ path: 'cities', version: '1' })
export class CitiesController {
  constructor(private readonly citiesService: CitiesService) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: 'Liste de toutes les villes couvertes (public)',
    description:
      'Retourne les villes actives avec leurs coordonnées GPS et leur slug.\n\n' +
      'Aucune authentification requise. Utilisé lors de l\'onboarding pour sélectionner la ville.',
  })
  @ApiOkResponse({ schema: { example: { data: [{ id: 'uuid', name: 'Ouagadougou', slug: 'ouagadougou', country: 'BF', isActive: true }] } } })
  findAll() {
    return this.citiesService.findAll();
  }

  @Public()
  @Get(':slug')
  @ApiOperation({
    summary: 'Détail d\'une ville par son slug (public)',
    description: 'Retourne la configuration de la ville : couverture géographique, services activés, fuseau horaire.',
  })
  @ApiOkResponse({ schema: { example: { id: 'uuid', name: 'Ouagadougou', slug: 'ouagadougou', country: 'BF', services: ['ride', 'food', 'delivery'] } } })
  @ApiNotFoundResponse({ description: 'Ville introuvable avec ce slug' })
  findBySlug(@Param('slug') slug: string) {
    return this.citiesService.findBySlug(slug);
  }
}
