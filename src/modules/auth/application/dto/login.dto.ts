import { IsString, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    example: '70000000',
    description: '8 chiffres locaux (ex: 70000000) OU format E.164 complet (ex: +22670000000)',
  })
  @Matches(/^(\+226\d{8}|\d{8})$/, {
    message: 'phone doit être 8 chiffres (ex: 70000000) ou au format +226XXXXXXXX',
  })
  phone: string;

  @ApiProperty({
    example: 'motdepasse123',
    minLength: 6,
    description: 'Mot de passe (min 6 caractères)',
  })
  @IsString()
  @MinLength(6)
  password: string;
}
