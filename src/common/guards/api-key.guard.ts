import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    const header = (req.headers['x-api-key'] || req.headers['X-API-Key']) as string | undefined;
    if (!header || header !== this.config.get<string>('API_KEY')) {
      throw new UnauthorizedException('Missing or invalid API key');
    }
    return true;
    }
}
