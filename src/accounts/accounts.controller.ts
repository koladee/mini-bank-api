import { Controller, Get, Param, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { AccountsService } from './accounts.service';

@ApiTags('Accounts')
@ApiSecurity('x-api-key')
@ApiBearerAuth()
@Controller('accounts')
export class AccountsController {
  constructor(private svc: AccountsService) {}

  @Get()
  async listMine(@Req() req: any) {
    return this.svc.listMine(req.user.sub);
  }

  @Get(':id/balance')
  async getBalance(@Param('id') id: string, @Req() req: any) {
    return this.svc.getBalance(id, req.user.sub);
  }
}
