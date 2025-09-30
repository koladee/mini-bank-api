import { Controller, Get, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { ReconciliationService } from './reconciliation.service';

@ApiTags('Reconciliation')
@ApiSecurity('x-api-key')
@ApiBearerAuth()
@Roles('admin')
@Controller('reconciliation')
export class ReconciliationController {
  constructor(private svc: ReconciliationService) {}
  @Get('verify')
  async verify(@Req() _req: any) {
    return this.svc.verify();
  }
}
