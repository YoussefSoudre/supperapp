import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiBadRequestResponse,
  ApiNoContentResponse,
} from '@nestjs/swagger';
import { AdminAuthService } from '../application/admin-auth.service';
import { AdminLoginDto, AdminAuthResponseDto, ForgotPasswordDto, ResetPasswordDto } from './dto/admin-auth.dto';
import { Public } from '../../../shared/decorators/public.decorator';
import { RefreshTokenDto } from '../../auth/application/dto/otp.dto';

@ApiTags('Admin Auth')
@Controller({ path: 'auth/admin', version: '1' })
export class AdminAuthController {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Connexion administrateur par email',
    description:
      'Authentifie un administrateur par email et mot de passe.\n\n' +
      'Retourne un `access_token` (JWT) et un `refresh_token` ainsi que les rôles et permissions de l\'utilisateur.\n\n' +
      '**Conditions requises :**\n' +
      '- L\'utilisateur doit avoir au moins un rôle assigné (via user_roles)\n' +
      '- Le compte doit être actif (status != INACTIVE, SUSPENDED)',
  })
  @ApiOkResponse({
    type: AdminAuthResponseDto,
    description: 'Connexion réussie — tokens et infos utilisateur retournés',
  })
  @ApiUnauthorizedResponse({ description: 'Email ou mot de passe incorrect / Compte inactif ou suspendu' })
  @ApiForbiddenResponse({ description: 'Accès refusé — aucun rôle admin assigné' })
  @ApiBadRequestResponse({ description: 'Données de requête invalides' })
  login(@Body() dto: AdminLoginDto) {
    return this.adminAuthService.login(dto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Renouveler l\'access_token via le refresh_token',
    description: 'Échange un refresh_token valide contre une nouvelle paire de tokens.',
  })
  @ApiOkResponse({ type: AdminAuthResponseDto, description: 'Nouveaux tokens émis' })
  @ApiUnauthorizedResponse({ description: 'Refresh token invalide ou expiré' })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.adminAuthService.refreshToken(dto.refresh_token);
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Déconnexion — révoque le refresh_token',
    description: 'Révoque le refresh_token fourni.',
  })
  @ApiNoContentResponse({ description: 'Déconnexion réussie' })
  logout(@Body() dto: RefreshTokenDto) {
    return this.adminAuthService.logout(dto.refresh_token);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Demander la réinitialisation du mot de passe',
    description:
      'Envoie un email avec un lien de réinitialisation si l\'adresse email correspond à un administrateur.\n\n' +
      'Pour des raisons de sécurité, retourne toujours un succès même si l\'email n\'existe pas.',
  })
  @ApiOkResponse({
    description: 'Demande traitée',
    schema: { example: { message: 'Si cet email existe, un lien de réinitialisation a été envoyé.' } },
  })
  @ApiBadRequestResponse({ description: 'Email invalide' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.adminAuthService.forgotPassword(dto);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Réinitialiser le mot de passe',
    description:
      'Réinitialise le mot de passe avec le token reçu par email.\n\n' +
      'Le token est à usage unique et expire après 1 heure.\n' +
      'Tous les appareils seront déconnectés après la réinitialisation.',
  })
  @ApiOkResponse({
    description: 'Mot de passe réinitialisé',
    schema: { example: { message: 'Mot de passe réinitialisé avec succès. Vous pouvez maintenant vous connecter.' } },
  })
  @ApiBadRequestResponse({ description: 'Token invalide ou expiré' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.adminAuthService.resetPassword(dto);
  }
}
