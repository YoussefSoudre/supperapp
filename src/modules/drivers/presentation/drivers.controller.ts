import { Controller, Get, Patch, Post, Request } from '@nestjs/common';
import {
  ApiTags, ApiBearerAuth, ApiOperation,
  ApiOkResponse, ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { DriversService } from '../application/drivers.service';
import { UnauthorizedDto } from '../../../shared/dto/swagger-responses.dto';

@ApiTags('Drivers')
@ApiBearerAuth('access-token')
@Controller({ path: 'drivers', version: '1' })
export class DriversController {
  constructor(private readonly driversService: DriversService) {}

  @Get('me')
  @ApiOperation({
    summary: 'Profil du chauffeur connecté',
    description: 'Retourne le profil chauffeur enrichi : `isOnline`, `currentLat/Lng`, `dispatchScore`, `vehicle`, `documents`.',
  })
  @ApiOkResponse({ schema: { example: { id: 'uuid', userId: 'uuid', isOnline: true, dispatchScore: 87.5, vehicle: { plate: 'AB-1234-BF' } } } })
  @ApiUnauthorizedResponse({ type: UnauthorizedDto })
  getProfile(@Request() req: { user: { id: string } }) {
    return this.driversService.findByUserId(req.user.id);
  }

  @Post('me/online')
  @ApiOperation({
    summary: 'Passer en ligne (disponible pour courses)',
    description:
      'Marque le chauffeur comme disponible. \n\n' +
      'Le système de dispatch commencera à lui affecter des courses.\n\n' +
      '> Un chauffeur non vérifié ne peut pas passer en ligne.',
  })
  @ApiOkResponse({ schema: { example: { isOnline: true, message: 'Vous êtes maintenant en ligne' } } })
  @ApiUnauthorizedResponse({ type: UnauthorizedDto })
  goOnline(@Request() req: { user: { id: string } }) {
    return this.driversService.setOnline(req.user.id);
  }

  @Post('me/offline')
  @ApiOperation({
    summary: 'Passer hors ligne (indisponible)',
    description: 'Retire le chauffeur du pool de dispatch. Les courses en cours ne sont pas affectées.',
  })
  @ApiOkResponse({ schema: { example: { isOnline: false, message: 'Vous êtes maintenant hors ligne' } } })
  @ApiUnauthorizedResponse({ type: UnauthorizedDto })
  goOffline(@Request() req: { user: { id: string } }) {
    return this.driversService.setOffline(req.user.id);
  }
}
