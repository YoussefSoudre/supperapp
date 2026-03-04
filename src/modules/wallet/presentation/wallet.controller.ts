import { Controller, Get, Query, Request } from '@nestjs/common';
import {
  ApiTags, ApiBearerAuth, ApiOperation,
  ApiOkResponse, ApiUnauthorizedResponse, ApiNotFoundResponse,
} from '@nestjs/swagger';
import { WalletService } from '../application/wallet.service';
import { WalletTxFilterDto } from './dto/wallet-tx-filter.dto';
import { WalletResponseDto, WalletTransactionResponseDto, UnauthorizedDto, NotFoundDto } from '../../../shared/dto/swagger-responses.dto';

@ApiTags('Wallet')
@ApiBearerAuth('access-token')
@Controller({ path: 'wallet', version: '1' })
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get()
  @ApiOperation({
    summary: 'Solde et détails du wallet',
    description: 'Retourne le solde en centimes XOF. Ex: `balance = 250000` = 2 500 FCFA.',
  })
  @ApiOkResponse({ type: WalletResponseDto })
  @ApiNotFoundResponse({ type: NotFoundDto, description: 'Wallet non trouvé (utilisateur sans wallet)' })
  @ApiUnauthorizedResponse({ type: UnauthorizedDto })
  getBalance(@Request() req: { user: { id: string } }) {
    return this.walletService.findByUserId(req.user.id);
  }

  @Get('transactions')
  @ApiOperation({
    summary: 'Historique des transactions du wallet (paginé + filtré)',
    description:
      'Retourne un historique immutable des opérations crédit/débit.\n\n' +
      '**Filtres standards** : `page`, `limit`, `sortBy` (createdAt|amount|balanceAfter), `sortOrder`, `dateFrom`, `dateTo`\n\n' +
      '**Filtres avancés** : `type` (credit|debit), `reason` (un ou plusieurs), `minAmount`, `maxAmount` (centimes)',
  })
  @ApiOkResponse({
    description: 'Liste paginée de transactions',
    schema: { example: { data: [], total: 87, page: 1, limit: 20, totalPages: 5 } },
  })
  @ApiUnauthorizedResponse({ type: UnauthorizedDto })
  getTransactions(
    @Request() req: { user: { id: string } },
    @Query() filters: WalletTxFilterDto,
  ) {
    return this.walletService.getTransactions(req.user.id, filters);
  }
}
