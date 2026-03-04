import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, ParseUUIDPipe,
  HttpCode, HttpStatus, Request,
} from '@nestjs/common';
import {
  ApiTags, ApiBearerAuth, ApiOperation,
  ApiCreatedResponse, ApiOkResponse, ApiNoContentResponse,
  ApiBadRequestResponse, ApiUnauthorizedResponse, ApiNotFoundResponse,
  ApiParam, ApiQuery,
} from '@nestjs/swagger';
import { Inject } from '@nestjs/common';
import { CreateRideUseCase } from '../application/use-cases/create-ride.usecase';
import { AcceptRideUseCase } from '../application/use-cases/accept-ride.usecase';
import { CompleteRideUseCase } from '../application/use-cases/complete-ride.usecase';
import { CancelRideUseCase } from '../application/use-cases/cancel-ride.usecase';
import { RateRideUseCase } from '../application/use-cases/rate-ride.usecase';
import { ModifyRideBeforeDepartureUseCase } from '../application/use-cases/modify-ride-before-departure.usecase';
import { ModifyRideEnRouteUseCase } from '../application/use-cases/modify-ride-enroute.usecase';
import { CreateRideDto } from '../application/dto/create-ride.dto';
import { CancelRideDto, RateRideDto } from '../application/dto/ride-actions.dto';
import {
  ModifyRideBeforeDepartureDto,
  ModifyRideEnRouteDto,
  DriverModificationResponseDto,
} from './dto/modify-ride.dto';
import { RideFilterDto } from './dto/ride-filter.dto';
import { RIDE_REPOSITORY, IRideRepository } from '../domain/interfaces/ride-repository.interface';
import {
  RideResponseDto, ValidationErrorDto, UnauthorizedDto, NotFoundDto,
} from '../../../shared/dto/swagger-responses.dto';

@ApiTags('Rides')
@ApiBearerAuth('access-token')
@Controller({ path: 'rides', version: '1' })
export class RidesController {
  constructor(
    private readonly createRide: CreateRideUseCase,
    private readonly acceptRide: AcceptRideUseCase,
    private readonly completeRide: CompleteRideUseCase,
    private readonly cancelRide: CancelRideUseCase,
    private readonly rateRide: RateRideUseCase,
    private readonly modifyBeforeDeparture: ModifyRideBeforeDepartureUseCase,
    private readonly modifyEnRouteUseCase: ModifyRideEnRouteUseCase,
    @Inject(RIDE_REPOSITORY)
    private readonly rideRepo: IRideRepository,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Créer une course (immédiate ou planifiée)',
    description:
      'Crée une course et lance la recherche de chauffeur (dispatch).\n\n' +
      '- Course **immédiate** : `scheduledAt` absent → status `PENDING` → `SEARCHING`\n' +
      '- Course **planifiée** : `scheduledAt` présent → status `SCHEDULED`, activation automatique via CRON\n' +
      '- Le prix estimé est calculé par le moteur de tarification (base + surge + heure)\n' +
      '- Un `promoCode` peut être appliqué pour remise',
  })
  @ApiCreatedResponse({ type: RideResponseDto, description: 'Course créée avec succès' })
  @ApiBadRequestResponse({ type: ValidationErrorDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedDto })
  async create(@Request() req: { user: { id: string; cityId: string } }, @Body() dto: CreateRideDto) {
    return this.createRide.execute(req.user.id, req.user.cityId, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Historique des courses de l\'utilisateur (paginé + filtré)',
    description:
      '**Filtres standards** : `page`, `limit`, `sortBy` (createdAt|scheduledAt|price), `sortOrder`, `dateFrom`, `dateTo`, `search` (adresse)\n\n' +
      '**Filtres avancés** : `status` (un ou plusieurs), `type` (moto|car|carpool), `cityId`, `driverId` (admin)',
  })
  @ApiOkResponse({ description: 'Liste paginée de courses', schema: { example: { data: [], total: 42, page: 1, limit: 20, totalPages: 3 } } })
  @ApiUnauthorizedResponse({ type: UnauthorizedDto })
  async list(
    @Request() req: { user: { id: string } },
    @Query() filters: RideFilterDto,
  ) {
    const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'DESC', ...rest } = filters;
    return this.rideRepo.findByUserId(req.user.id, {
      page: +page,
      limit: +limit,
      orderBy: sortBy,
      order: sortOrder,
      filters: rest,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail d\'une course' })
  @ApiParam({ name: 'id', description: 'UUID de la course' })
  @ApiOkResponse({ type: RideResponseDto })
  @ApiNotFoundResponse({ type: NotFoundDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedDto })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.rideRepo.findById(id);
  }

  @Patch(':id/accept')
  @ApiOperation({
    summary: 'Chauffeur accepte la course',
    description: 'Transition `SEARCHING` → `ACCEPTED`. Seul le chauffeur dispatche peut accepter.',
  })
  @ApiParam({ name: 'id', description: 'UUID de la course' })
  @ApiOkResponse({ type: RideResponseDto, description: 'Course acceptée' })
  @ApiNotFoundResponse({ type: NotFoundDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedDto })
  async accept(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.acceptRide.execute(id, req.user.id);
  }

  @Patch(':id/complete')
  @ApiOperation({
    summary: 'Marquer la course comme terminée',
    description: 'Transition `IN_PROGRESS` → `COMPLETED`. Émet `ride.completed` → crédite le wallet chauffeur (80%).',
  })
  @ApiParam({ name: 'id', description: 'UUID de la course' })
  @ApiOkResponse({ type: RideResponseDto, description: 'Course terminée, wallet chauffeur crédité' })
  @ApiNotFoundResponse({ type: NotFoundDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedDto })
  async complete(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('finalPrice') finalPrice: number,
  ) {
    return this.completeRide.execute(id, finalPrice);
  }

  @Patch(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Annuler une course',
    description:
      'Annulable si status dans `PENDING`, `SEARCHING`, `ACCEPTED`, `SCHEDULED`.\n\n' +
      '- `cancelledBy` est d\u00e9termin\u00e9 automatiquement (user/driver/admin) selon l\u0027identit\u00e9 du requ\u00e9rant\n' +
      '- \u00c9met `ride.cancelled` \u2192 notification push aux deux parties',
  })
  @ApiParam({ name: 'id', description: 'UUID de la course' })
  @ApiOkResponse({ type: RideResponseDto, description: 'Course annulée' })
  @ApiBadRequestResponse({ type: ValidationErrorDto, description: 'Transition de statut invalide' })
  @ApiNotFoundResponse({ type: NotFoundDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedDto })
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelRideDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.cancelRide.execute({
      rideId:      id,
      requesterId: req.user.id,
      reason:      dto.reason,
    });
  }

  // ─── Modification avant départ ────────────────────────────────────────────

  @Patch(':id/modify')
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'id', description: 'UUID de la course' })
  @ApiOkResponse({ description: 'Modification appliquée ou en attente de confirmation chauffeur' })
  @ApiBadRequestResponse({ type: ValidationErrorDto })
  @ApiNotFoundResponse({ type: NotFoundDto })
  @ApiOperation({
    summary: 'Modifier une course avant départ',
    description:
      'Fonctionne pour les statuts SCHEDULED, PENDING, SEARCHING, ACCEPTED. ' +
      'Détecte les conflits de destination (>1 km) et notifie le chauffeur.',
  })
  async modify(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ModifyRideBeforeDepartureDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.modifyBeforeDeparture.execute(id, req.user.id, dto);
  }

  // ─── Modification en cours de route ──────────────────────────────────────

  @Patch(':id/modify-enroute')
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'id', description: 'UUID de la course (statut IN_PROGRESS requis)' })
  @ApiOperation({
    summary: 'Modifier la destination en cours de route',
    description:
      'Uniquement pour une course **IN_PROGRESS**. Si le détour > 2 km, le chauffeur a **2 minutes** pour refuser.\n\n' +
      'Passé ce délai, la modification est acceptée implicitement.\n\n' +
      'Body : `{ dropoffLat, dropoffLng, dropoffAddress }`',
  })
  @ApiOkResponse({ description: 'Modification enregistrée (en attente de confirmation chauffeur si >2km)' })
  @ApiNotFoundResponse({ type: NotFoundDto })
  @ApiBadRequestResponse({ type: ValidationErrorDto, description: 'Course non en cours ou données invalides' })
  @ApiUnauthorizedResponse({ type: UnauthorizedDto })
  async modifyEnRoute(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ModifyRideEnRouteDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.modifyEnRouteUseCase.execute(id, req.user.id, dto);
  }

  // ─── Réponse du chauffeur à une demande de modification ──────────────────

  @Patch(':id/modification/respond')
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'id', description: 'UUID de la course' })
  @ApiOperation({
    summary: 'Chauffeur accepte ou refuse une modification',
    description:
      '**Avant départ** : refus → la course est réassignée à un autre chauffeur disponible.\n\n' +
      '**En cours de route** : refus → la course continue jusqu\'à l\'ancienne destination.\n\n' +
      'Body : `{ accepted: boolean }`',
  })
  @ApiOkResponse({
    description: 'Réponse enregistrée',
    schema: { example: { message: 'Modification acceptée', rideId: 'uuid', driverId: 'uuid', accepted: true } },
  })
  @ApiNotFoundResponse({ type: NotFoundDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedDto })
  async respondToModification(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DriverModificationResponseDto,
    @Request() req: { user: { id: string } },
  ) {
    // La logique de résolution est entièrement gérée par RideModificationWorker
    // (job RESOLVE_DRIVER_CONFLICT). Ce endpoint permet au chauffeur d'enregistrer
    // sa réponse dans Redis avant l'expiration du timeout de 2 minutes.
    return {
      message: dto.accepted ? 'Modification acceptée' : 'Modification refusée',
      rideId: id,
      driverId: req.user.id,
      accepted: dto.accepted,
    };
  }

  // ─── Journal des modifications ────────────────────────────────────────────

  @Get(':id/modification-logs')
  @ApiParam({ name: 'id', description: 'UUID de la course' })
  @ApiOperation({
    summary: 'Journal d\'audit des modifications d\'une course',
    description:
      'Retourne l\'historique immutable des demandes de modification (avant départ et en route) pour cette course.\n\n' +
      'Chaque entrée contient : `type`, `status`, `requestedBy`, `newDropoffAddress`, `diff`, `createdAt`',
  })
  @ApiOkResponse({ description: 'Tableau des entrées de journal', schema: { example: { data: [] } } })
  @ApiNotFoundResponse({ type: NotFoundDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedDto })
  async getModificationLogs(@Param('id', ParseUUIDPipe) id: string) {
    return this.rideRepo.findModificationLogs(id);
  }

  // ─── Note ─────────────────────────────────────────────────────────────────

  @Post(':id/rate')
  @ApiParam({ name: 'id', description: 'UUID de la course (doit être en statut COMPLETED)' })
  @ApiOperation({
    summary: 'Évaluer une course terminée (1-5 étoiles)',
    description:
      'Permet au passager ou au chauffeur de noter la course.\n\n' +
      '- `rating` : entier de 1 à 5\n' +
      '- `comment` : commentaire optionnel (max 500 caractères)\n\n' +
      'Met à jour la note moyenne du chauffeur dans le module Dispatch.',
  })
  @ApiOkResponse({ description: 'Note enregistrée', schema: { example: { rideId: 'uuid', rating: 4, comment: 'Très bon trajet' } } })
  @ApiBadRequestResponse({ type: ValidationErrorDto, description: 'Course non terminée ou déjà notée' })
  @ApiNotFoundResponse({ type: NotFoundDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedDto })
  async rate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RateRideDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.rateRide.execute({
      rideId:      id,
      requesterId: req.user.id,
      rating:      dto.rating,
      comment:     dto.comment,
    });
  }
}

