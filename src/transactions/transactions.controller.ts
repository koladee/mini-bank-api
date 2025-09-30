import { Controller, Get, Post, Body, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { TransactionsService } from './transactions.service';
import { ExchangeDto, TransferDto, TxQueryDto } from './dto';

@ApiTags('Transactions')
@ApiSecurity('x-api-key')
@ApiBearerAuth()
@Controller('transactions')
export class TransactionsController {
  constructor(private svc: TransactionsService) {}

  @Get()
  async list(@Req() req: any, @Query() q: TxQueryDto) {
    return this.svc.list(req.user.sub, q.type, Number(q.page) || 1, Number(q.limit) || 10);
  }

  @Post('transfer')
  async transfer(@Req() req: any, @Body() dto: TransferDto) {
    return this.svc.transfer(req.user.sub, dto.recipientUserId, dto.currency, dto.amount, dto.idempotencyKey);
  }

  @Post('exchange')
  async exchange(@Req() req: any, @Body() dto: ExchangeDto) {
    return this.svc.exchange(req.user.sub, dto.fromCurrency, dto.amount, dto.idempotencyKey);
  }
}
