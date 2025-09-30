import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AccountsService {
  constructor(private prisma: PrismaService) {}

  async listMine(userId: string) {
    return this.prisma.account.findMany({ where: { userId }, orderBy: { currency: 'asc' } });
  }

  async getBalance(accountId: string, userId: string) {
    const acc = await this.prisma.account.findFirst({ where: { id: accountId, userId } });
    if (!acc) throw new NotFoundException('Account not found');
    return { accountId: acc.id, currency: acc.currency, balance: acc.balance };
  }
}
