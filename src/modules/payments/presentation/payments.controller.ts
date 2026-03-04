import { Controller, Post, Body, Request, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import {
  ApiTags, ApiBearerAuth, ApiOperation,
  ApiCreatedResponse, ApiOkResponse,
  ApiBadRequestResponse, ApiUnauthorizedResponse, ApiNotFoundResponse, ApiParam,
} from '@nestjs/swagger';
import { PaymentsService } from '../application/payments.service';
import { InitiatePaymentDto, ConfirmPaymentDto } from './dto/payment.dto';
import { PaymentResponseDto, ValidationErrorDto, UnauthorizedDto, NotFoundDto } from '../../../shared/dto/swagger-responses.dto';

@ApiTags('Payments')
@ApiBearerAuth('access-token')
@Controller({ path: 'payments', version: '1' })
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('initiate')
  @ApiOperation({
    summary: 'Initier un paiement mobile money',
    description:
      'Lance un paiement auprès de l\'opérateur (Orange Money, Moov Money, Coris Bank) ou débite le wallet interne.\n\n' +
      '**Flux** :\n' +
      '1. Crée un enregistrement `Payment` en statut `pending`\n' +
      '2. Appelle l\'API de l\'opérateur pour lancer la demande de paiement (USSD push)\n' +
      '3. L\'utilisateur confirme sur son téléphone\n' +
      '4. L\'opérateur envoie un webhook ou le client appelle `POST /payments/:id/confirm`',
  })
  @ApiCreatedResponse({ type: PaymentResponseDto, description: 'Paiement initié — en attente de confirmation' })
  @ApiBadRequestResponse({ type: ValidationErrorDto })
  @ApiUnauthorizedResponse({ type: UnauthorizedDto })
  initiate(
    @Request() req: { user: { id: string } },
    @Body() body: InitiatePaymentDto,
  ) {
    return this.paymentsService.initiate({ userId: req.user.id, ...body });
  }

  @Post(':id/confirm')
  @ApiOperation({
    summary: 'Confirmer un paiement (webhook opérateur)',
    description:
      'Marque le paiement comme `success` et émet `payment.success` → crédite le wallet si topup.\n\n' +
      '> Typiquement appelé par le système de webhook, pas directement par le client mobile.',
  })
  @ApiParam({ name: 'id', description: 'UUID du paiement à confirmer' })
  @ApiOkResponse({ type: PaymentResponseDto, description: 'Paiement confirmé' })
  @ApiNotFoundResponse({ type: NotFoundDto })
  @ApiBadRequestResponse({ type: ValidationErrorDto })
  confirm(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: ConfirmPaymentDto,
  ) {
    return this.paymentsService.confirmSuccess(id, body.providerTxId);
  }
}
