import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';

@ApiTags('Meta')
@ApiSecurity('x-api-key')
@ApiBearerAuth()
@Controller('meta')
export class MetaController {
  constructor(private cfg: ConfigService) {}
  @Get('rates')
  getRates() {
    const usdEur = Number(this.cfg.get<number>('FX_USD_EUR'));
    return { USD_EUR: usdEur };
  }
}
