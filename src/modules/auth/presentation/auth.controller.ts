import { Body, Controller, HttpCode, HttpStatus, Post, Query, Request } from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiBearerAuth,
  ApiResponse, ApiBody, ApiQuery,
  ApiCreatedResponse, ApiOkResponse, ApiNoContentResponse,
  ApiBadRequestResponse, ApiUnauthorizedResponse, ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { AuthService } from '../application/auth.service';
import { OtpService } from '../application/services/otp.service';
import { LoginDto } from '../application/dto/login.dto';
import { RegisterDto } from '../application/dto/register.dto';
import { SendOtpDto, VerifyOtpDto, RefreshTokenDto } from '../application/dto/otp.dto';
import { Public } from '../../../shared/decorators/public.decorator';
import {
  AuthTokensDto, OtpResponseDto, OtpVerifyResponseDto,
  ValidationErrorDto, UnauthorizedDto, TooManyRequestsDto,
} from '../../../shared/dto/swagger-responses.dto';

@ApiTags('Auth')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly otpService: OtpService,
  ) {}

  @Public()
  @Post('register')
  @ApiOperation({
    summary: 'Créer un compte utilisateur',
    description:
      'Crée un nouvel utilisateur, génère automatiquement un `referralCode` unique (ex: `YOUS-K3P2X1`), ' +
      'crée un wallet XOF vide et émet l\'event `user.registered`.\n\n' +
      '> `cityId` est passé en query param — obligatoire pour localiser l\'utilisateur.',
  })
  @ApiQuery({
    name: 'cityId',
    description: 'UUID de la ville principale de l\'utilisateur',
    example: 'uuid-v4-city-ouaga',
    required: true,
  })
  @ApiCreatedResponse({ type: AuthTokensDto, description: 'Compte créé — tokens retournés directement' })
  @ApiBadRequestResponse({ type: ValidationErrorDto, description: 'Données invalides (téléphone, email…)' })
  register(@Body() dto: RegisterDto, @Query('cityId') cityId: string) {
    return this.authService.register(dto, cityId);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Connexion par téléphone + mot de passe',
    description:
      'Retourne un `access_token` (JWT, 15 min) et un `refresh_token` (UUID, 30 jours, stocké dans Redis).\n\n' +
      'La rotation est automatique : chaque `POST /auth/refresh` révoque l\'ancien refresh_token.',
  })
  @ApiOkResponse({ type: AuthTokensDto, description: 'Connexion réussie' })
  @ApiUnauthorizedResponse({ type: UnauthorizedDto, description: 'Téléphone ou mot de passe incorrect' })
  @ApiBadRequestResponse({ type: ValidationErrorDto })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  // ─── Refresh Token ──────────────────────────────────────────────────────

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Renouveler l\'access_token via le refresh_token',
    description:
      '**Rotation de token** : l\'ancien `refresh_token` est immédiatement révoqué dans Redis et ' +
      'un nouveau couple `(access_token, refresh_token)` est retourné.\n\n' +
      'Si le refresh_token est inconnu, expiré ou déjà révoqué → `401 Unauthorized`.',
  })
  @ApiOkResponse({ type: AuthTokensDto, description: 'Nouveaux tokens émis' })
  @ApiUnauthorizedResponse({ type: UnauthorizedDto, description: 'Refresh token invalide ou expiré' })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshTokens(dto.refresh_token);
  }

  @ApiBearerAuth('access-token')
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Déconnexion — révoque le refresh_token courant',
    description: 'L\'access_token reste valide jusqu\'à son expiration naturelle (15 min).',
  })
  @ApiNoContentResponse({ description: 'Déconnexion réussie' })
  @ApiUnauthorizedResponse({ type: UnauthorizedDto })
  logout(@Body() dto: RefreshTokenDto) {
    return this.authService.logout(dto.refresh_token);
  }

  @ApiBearerAuth('access-token')
  @Post('logout/all')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Déconnexion de tous les appareils',
    description: 'Révoque **tous** les refresh_tokens de l\'utilisateur (tous appareils connectés).',
  })
  @ApiNoContentResponse({ description: 'Tous les appareils déconnectés' })
  @ApiUnauthorizedResponse({ type: UnauthorizedDto })
  logoutAll(@Request() req: { user: { id: string } }) {
    return this.authService.logoutAll(req.user.id);
  }

  // ─── OTP ────────────────────────────────────────────────────────────────

  @Public()
  @Post('otp/send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Envoyer un OTP SMS (6 chiffres, valable 5 min)',
    description:
      'Génère un code OTP à 6 chiffres et l\'envoie par SMS.\n\n' +
      '**Limites :**\n' +
      '- Max 5 envois par heure par numéro\n' +
      '- Code valide **5 minutes**\n' +
      '- Après 5 tentatives incorrectes → blocage **15 minutes**\n' +
      '- En dev : le code est loggué dans la console (pas de SMS réel)',
  })
  @ApiOkResponse({ type: OtpResponseDto, description: 'OTP envoyé avec succès' })
  @ApiTooManyRequestsResponse({ type: TooManyRequestsDto, description: 'Limite d\'envoi atteinte (5/heure)' })
  @ApiBadRequestResponse({ type: ValidationErrorDto })
  sendOtp(@Body() dto: SendOtpDto) {
    return this.otpService.sendOtp(dto.phone);
  }

  @Public()
  @Post('otp/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Vérifier le code OTP reçu par SMS',
    description:
      'Vérifie le code OTP et le supprime immédiatement (usage unique).\n\n' +
      'Après validation réussie, marquer `phoneVerified = true` sur le profil utilisateur ' +
      'via `PATCH /users/me`.',
  })
  @ApiOkResponse({ type: OtpVerifyResponseDto, description: 'Code OTP valide' })
  @ApiUnauthorizedResponse({ type: UnauthorizedDto, description: 'Code OTP invalide ou expiré' })
  @ApiTooManyRequestsResponse({ type: TooManyRequestsDto, description: 'Trop de tentatives — bloqué 15 minutes' })
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    await this.otpService.verifyOtp(dto.phone, dto.code);
    return { verified: true };
  }
}
