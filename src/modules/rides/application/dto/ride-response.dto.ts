import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RideStatus, RideType } from '../../domain/entities/ride.entity';

export class RideResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() userId: string;
  @ApiPropertyOptional() driverId: string | null;
  @ApiProperty({ enum: RideType }) type: RideType;
  @ApiProperty({ enum: RideStatus }) status: RideStatus;
  @ApiProperty() pickupAddress: string;
  @ApiProperty() dropoffAddress: string;
  @ApiProperty() estimatedPrice: number;
  @ApiPropertyOptional() finalPrice: number | null;
  @ApiProperty() currency: string;
  @ApiProperty() surgeFactor: number;
  @ApiPropertyOptional() distanceKm: number | null;
  @ApiPropertyOptional() scheduledAt: Date | null;
  @ApiProperty() createdAt: Date;
}
