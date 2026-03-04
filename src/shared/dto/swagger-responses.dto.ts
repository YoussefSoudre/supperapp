import { ApiProperty } from '@nestjs/swagger';

/**
 * Classes de réponse génériques pour la documentation Swagger.
 * Ne sont PAS utilisées dans la logique métier — uniquement pour @ApiResponse({ type: ... }).
 */

// ─── Pagination ──────────────────────────────────────────────────────────────

export class PaginatedMetaDto {
  @ApiProperty({ example: 1, description: 'Page courante' })
  page: number;

  @ApiProperty({ example: 20, description: 'Éléments par page' })
  limit: number;

  @ApiProperty({ example: 142, description: 'Total d\'éléments' })
  total: number;

  @ApiProperty({ example: 8, description: 'Nombre total de pages' })
  totalPages: number;
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export class AuthTokensDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT access token — expiration 15 minutes',
  })
  access_token: string;

  @ApiProperty({
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    description: 'UUID refresh token — expiration 30 jours, stocké dans Redis',
  })
  refresh_token: string;

  @ApiProperty({ example: 900, description: 'Durée de vie de l\'access_token en secondes' })
  expires_in: number;

  @ApiProperty({ description: 'Données publiques de l\'utilisateur connecté' })
  user: UserPublicDto;
}

export class OtpResponseDto {
  @ApiProperty({ example: true })
  sent: boolean;

  @ApiProperty({ example: 'OTP envoyé au +22670000000', description: 'Message de confirmation' })
  message: string;
}

export class OtpVerifyResponseDto {
  @ApiProperty({ example: true })
  verified: boolean;
}

// ─── Users ───────────────────────────────────────────────────────────────────

export class UserPublicDto {
  @ApiProperty({ example: 'uuid-v4', description: 'Identifiant unique' })
  id: string;

  @ApiProperty({ example: 'Youssef', description: 'Prénom' })
  firstName: string;

  @ApiProperty({ example: 'Kaboré', description: 'Nom de famille' })
  lastName: string;

  @ApiProperty({ example: '+22670000000' })
  phone: string;

  @ApiProperty({ example: 'user@example.com', nullable: true })
  email: string | null;

  @ApiProperty({ example: 'active', enum: ['active', 'inactive', 'suspended', 'pending_kyc'] })
  status: string;

  @ApiProperty({ example: 'YOUS-K3P2X1', description: 'Code de parrainage unique' })
  referralCode: string;

  @ApiProperty({ example: false })
  phoneVerified: boolean;

  @ApiProperty({ example: false })
  kycVerified: boolean;

  @ApiProperty({ example: '2026-01-15T10:30:00Z' })
  createdAt: Date;
}

// ─── Rides ───────────────────────────────────────────────────────────────────

export class RideResponseDto {
  @ApiProperty({ example: 'uuid-v4' })
  id: string;

  @ApiProperty({ example: 'pending', enum: ['pending', 'searching', 'accepted', 'driver_en_route', 'arrived', 'in_progress', 'completed', 'cancelled', 'scheduled', 'no_driver'] })
  status: string;

  @ApiProperty({ example: 'moto', enum: ['moto', 'car', 'carpool'] })
  type: string;

  @ApiProperty({ example: 'Rond-Point CAN, Ouagadougou' })
  pickupAddress: string;

  @ApiProperty({ example: 12.3547 })
  pickupLat: number;

  @ApiProperty({ example: -1.5256 })
  pickupLng: number;

  @ApiProperty({ example: 'Hôpital Yalgado, Ouagadougou' })
  dropoffAddress: string;

  @ApiProperty({ example: 12.3648 })
  dropoffLat: number;

  @ApiProperty({ example: -1.5312 })
  dropoffLng: number;

  @ApiProperty({ example: 75000, description: 'Prix en centimes XOF (750 FCFA)' })
  price: number;

  @ApiProperty({ example: null, nullable: true, description: 'Heure de départ planifiée (course schedulée)' })
  scheduledAt: string | null;

  @ApiProperty({ example: '2026-01-15T10:30:00Z' })
  createdAt: Date;
}

// ─── Wallet ───────────────────────────────────────────────────────────────────

export class WalletResponseDto {
  @ApiProperty({ example: 'uuid-v4' })
  id: string;

  @ApiProperty({ example: 'uuid-v4', description: 'ID de l\'utilisateur propriétaire' })
  userId: string;

  @ApiProperty({ example: 250000, description: 'Solde en centimes XOF (2500 FCFA)' })
  balance: number;

  @ApiProperty({ example: 'XOF' })
  currency: string;

  @ApiProperty({ example: 'active', enum: ['active', 'suspended', 'closed'] })
  status: string;
}

export class WalletTransactionResponseDto {
  @ApiProperty({ example: 'uuid-v4' })
  id: string;

  @ApiProperty({ example: 'credit', enum: ['credit', 'debit'] })
  type: string;

  @ApiProperty({
    example: 'ride_earning',
    enum: ['ride_payment', 'ride_earning', 'delivery_payment', 'delivery_earning', 'food_payment', 'topup', 'withdrawal', 'referral_bonus', 'promo_credit', 'refund', 'admin_adjustment'],
  })
  reason: string;

  @ApiProperty({ example: 60000, description: 'Montant en centimes' })
  amount: number;

  @ApiProperty({ example: 310000, description: 'Solde après la transaction en centimes' })
  balanceAfter: number;

  @ApiProperty({ example: 'XOF' })
  currency: string;

  @ApiProperty({ example: '2026-01-15T10:30:00Z' })
  createdAt: Date;
}

// ─── Payments ────────────────────────────────────────────────────────────────

export class PaymentResponseDto {
  @ApiProperty({ example: 'uuid-v4' })
  id: string;

  @ApiProperty({
    example: 'pending',
    enum: ['pending', 'processing', 'success', 'failed', 'refunded', 'cancelled'],
  })
  status: string;

  @ApiProperty({ example: 75000, description: 'Montant en centimes XOF' })
  amount: number;

  @ApiProperty({
    example: 'orange_money',
    enum: ['orange_money', 'moov_money', 'coris_bank', 'wallet', 'cash'],
  })
  provider: string;

  @ApiProperty({ example: 'ride', enum: ['ride', 'delivery', 'food', 'wallet_topup', 'withdrawal'] })
  serviceType: string;

  @ApiProperty({ example: '2026-01-15T10:30:00Z' })
  createdAt: Date;
}

// ─── Delivery ────────────────────────────────────────────────────────────────

export class DeliveryResponseDto {
  @ApiProperty({ example: 'uuid-v4' })
  id: string;

  @ApiProperty({
    example: 'pending',
    enum: ['pending', 'searching', 'accepted', 'picked_up', 'in_transit', 'delivered', 'failed', 'cancelled'],
  })
  status: string;

  @ApiProperty({ example: 'small', enum: ['small', 'medium', 'large'] })
  packageSize: string;

  @ApiProperty({ example: 'Secteur 4, Ouagadougou', description: 'Adresse de collecte' })
  pickupAddress: string;

  @ApiProperty({ example: 'Secteur 17, Ouagadougou', description: 'Adresse de livraison' })
  dropoffAddress: string;

  @ApiProperty({ example: 30000, description: 'Prix en centimes XOF' })
  price: number;

  @ApiProperty({ example: '2026-01-15T10:30:00Z' })
  createdAt: Date;
}

// ─── Notifications ───────────────────────────────────────────────────────────

export class NotificationResponseDto {
  @ApiProperty({ example: 'uuid-v4' })
  id: string;

  @ApiProperty({ example: 'push', enum: ['push', 'sms', 'email', 'in_app', 'whatsapp'] })
  channel: string;

  @ApiProperty({
    example: 'ride',
    enum: ['ride', 'payment', 'promotion', 'system', 'referral', 'delivery', 'food'],
  })
  category: string;

  @ApiProperty({ example: '🚗 Chauffeur trouvé !' })
  title: string;

  @ApiProperty({ example: 'Votre chauffeur est en route. ETA: 3 min.' })
  body: string;

  @ApiProperty({ example: 'delivered', enum: ['pending', 'queued', 'sent', 'delivered', 'read', 'failed', 'scheduled'] })
  status: string;

  @ApiProperty({ example: '2026-01-15T10:30:00Z' })
  createdAt: Date;
}

// ─── Error responses ─────────────────────────────────────────────────────────

export class ValidationErrorDto {
  @ApiProperty({ example: 400 })
  statusCode: number;

  @ApiProperty({ example: ['phone must be a valid phone number', 'password is too short'], isArray: true })
  message: string[];

  @ApiProperty({ example: 'Bad Request' })
  error: string;
}

export class UnauthorizedDto {
  @ApiProperty({ example: 401 })
  statusCode: number;

  @ApiProperty({ example: 'Unauthorized' })
  message: string;
}

export class ForbiddenDto {
  @ApiProperty({ example: 403 })
  statusCode: number;

  @ApiProperty({ example: 'Accès refusé — rôle insuffisant' })
  message: string;
}

export class NotFoundDto {
  @ApiProperty({ example: 404 })
  statusCode: number;

  @ApiProperty({ example: 'Ressource introuvable' })
  message: string;
}

export class TooManyRequestsDto {
  @ApiProperty({ example: 429 })
  statusCode: number;

  @ApiProperty({ example: 'Trop de requêtes — limite atteinte' })
  message: string;
}
