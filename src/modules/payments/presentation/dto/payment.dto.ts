import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber, IsPhoneNumber, IsString, IsUUID, Min } from 'class-validator';
import { PaymentProvider, PaymentServiceType } from '../../domain/entities/payment.entity';

export class InitiatePaymentDto {
  @ApiProperty({
    enum: PaymentServiceType,
    example: PaymentServiceType.RIDE,
    description: 'Service concerné par le paiement',
  })
  @IsEnum(PaymentServiceType)
  serviceType: PaymentServiceType;

  @ApiProperty({
    example: 'uuid-v4',
    description: 'ID de la ressource à payer (rideId, orderId, deliveryId…)',
  })
  @IsUUID()
  referenceId: string;

  @ApiProperty({
    example: 75000,
    description: 'Montant en centimes XOF (ex: 75000 = 750 FCFA)',
  })
  @IsNumber()
  @Min(100)
  amount: number;

  @ApiProperty({
    enum: PaymentProvider,
    example: PaymentProvider.ORANGE_MONEY,
    description: 'Opérateur de paiement',
  })
  @IsEnum(PaymentProvider)
  provider: PaymentProvider;

  @ApiProperty({
    example: '+22670000000',
    description: 'Numéro de téléphone mobile money du payeur',
  })
  @IsPhoneNumber()
  phone: string;
}

export class ConfirmPaymentDto {
  @ApiProperty({
    example: 'OM-TXN-20260115-001',
    description: 'Identifiant de transaction retourné par l\'opérateur (Orange, Moov, Coris)',
  })
  @IsString()
  @IsNotEmpty()
  providerTxId: string;
}
