import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import Decimal from 'decimal.js';

@Injectable()
export class ReconciliationService {
  constructor(private prisma: PrismaService) {}
  async verify() {
    const accounts = await this.prisma.account.findMany();
    const issues: Array<{accountId:string; expected:string; actual:string}> = [];

    for (const acc of accounts) {
      const sum = await this.prisma.ledger.aggregate({
        where: { accountId: acc.id },
        _sum: { amount: true },
      });
      const expected = new Decimal(sum._sum.amount?.toString() || '0').toDecimalPlaces(2);
      const actual = new Decimal(acc.balance.toString()).toDecimalPlaces(2);
      if (!expected.eq(actual)) {
        issues.push({ accountId: acc.id, expected: expected.toString(), actual: actual.toString() });
      }
    }
    return { ok: issues.length === 0, issues };
  }
}
