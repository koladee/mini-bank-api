import { Controller, Get, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Users')
@ApiSecurity('x-api-key')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private prisma: PrismaService) {}

  // Simple list for recipient selection (excludes current user)
  @Get()
  async list(
    @Req() req: any,
    @Query('q') q?: string,
    @Query('limit') limit = '20'
  ) {
    const where: any = {
      id: { not: req.user.sub },
      ...(q ? { email: { contains: q, mode: 'insensitive' } } : {}),
    };
    const items = await this.prisma.user.findMany({
      where,
      select: { id: true, email: true, role: true },
      orderBy: { email: 'asc' },
      take: Math.min(Number(limit) || 20, 100),
    });
    return items;
  }
}
