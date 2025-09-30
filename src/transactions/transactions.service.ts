import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import Decimal from 'decimal.js';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TransactionsService {
  constructor(private prisma: PrismaService, private cfg: ConfigService) {}

  private async ensureIdempotency(userId: string, key?: string) {
    if (!key) return null;
    try {
      const res = await this.prisma.idempotencyKey.create({
        data: { key, userId, status: 'stored' },
      });
      return res;
    } catch (e) {
      // key exists
      const existing = await this.prisma.idempotencyKey.findUnique({
        where: { key_userId: { key, userId } as any },
      } as any);
      if (existing?.responseJson) return existing; // replay response
      throw new BadRequestException('Duplicate request (idempotency)');
    }
  }

  async list(userId: string, type?: 'transfer'|'exchange', page = 1, limit = 10) {
    
    const accounts = await this.prisma.account.findMany({
      where: { userId },
      select: { id: true },
    });
    const accountIds = accounts.map(a => a.id);
    if (accountIds.length === 0) {
      return { items: [], total: 0, page, limit };
    }

    const txIdRows = await this.prisma.ledger.findMany({
      where: { accountId: { in: accountIds } },
      select: { transactionId: true },
      distinct: ['transactionId'],
      orderBy: { transactionId: 'asc' },
    });
    const txIds = txIdRows.map(r => r.transactionId);
    if (txIds.length === 0) {
      return { items: [], total: 0, page, limit };
    }
    
    const where: any = {
    id: { in: txIds },
    ...(type ? { type } : {}),
  };
    
    const [items, total] = await this.prisma.$transaction([
      this.prisma.transaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return { items, total, page, limit };
  }


  async transfer(initiatorUserId: string, recipientUserId: string, currency: 'USD'|'EUR', amountNum: number, idempotencyKey?: string) {
    const idem = await this.ensureIdempotency(initiatorUserId, idempotencyKey);
    const amount = new Decimal(amountNum).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    if (amount.lte(0)) throw new BadRequestException('Amount must be > 0');

    const result = await this.prisma.$transaction(async (tx) => {
      const [srcAcc, dstUser] = await Promise.all([
        tx.account.findFirst({ where: { userId: initiatorUserId, currency } }),
        tx.user.findUnique({ where: { id: recipientUserId } }),
      ]);
      if (!srcAcc) throw new NotFoundException('Source account not found');
      if (!dstUser) throw new NotFoundException('Recipient not found');
      const dstAcc = await tx.account.findFirst({ where: { userId: recipientUserId, currency } });
      if (!dstAcc) throw new NotFoundException('Recipient account not found');

      await tx.account.update({ where: { id: srcAcc.id }, data: { balance: srcAcc.balance } });
      await tx.account.update({ where: { id: dstAcc.id }, data: { balance: dstAcc.balance } });

      const srcBal = new Decimal(srcAcc.balance.toString());
      if (srcBal.lt(amount)) throw new BadRequestException('INSUFFICIENT_FUNDS');

      const txEnvelope = await tx.transaction.create({
        data: {
          type: 'transfer', status: 'committed',
          initiatorUserId, baseCurrency: currency, amount: amount.toNumber(),
          meta: { recipientUserId },
        },
      });

      // DOUBLE-ENTRY ledger (sum = 0)
      await tx.ledger.createMany({
        data: [
          { transactionId: txEnvelope.id, accountId: srcAcc.id, currency, amount: amount.neg().toNumber() },
          { transactionId: txEnvelope.id, accountId: dstAcc.id, currency, amount: amount.toNumber() },
        ],
      });

      // balances
      await tx.account.update({ where: { id: srcAcc.id }, data: { balance: srcBal.minus(amount).toNumber() } });
      await tx.account.update({ where: { id: dstAcc.id }, data: { balance: new Decimal(dstAcc.balance.toString()).plus(amount).toNumber() } });

      return txEnvelope;
    }, { isolationLevel: 'Serializable' as any });

    if (idem) {
      await this.prisma.idempotencyKey.update({
        where: { id: idem.id },
        data: { status: 'completed', transactionId: result.id, responseJson: result },
      });
    }
    return result;
  }

  async exchange(initiatorUserId: string, fromCurrency: 'USD'|'EUR', amountNum: number, idempotencyKey?: string) {
    const idem = await this.ensureIdempotency(initiatorUserId, idempotencyKey);
    const rate = new Decimal(this.cfg.get<number>('FX_USD_EUR')!);
    const amount = new Decimal(amountNum).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    if (amount.lte(0)) throw new BadRequestException('Amount must be > 0');

    const toCurrency = fromCurrency === 'USD' ? 'EUR' : 'USD';
    const converted = fromCurrency === 'USD'
      ? amount.mul(rate)
      : amount.div(rate);
    const converted2 = converted.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

    const result = await this.prisma.$transaction(async (tx) => {
      const fromAcc = await tx.account.findFirst({ where: { userId: initiatorUserId, currency: fromCurrency } });
      const toAcc   = await tx.account.findFirst({ where: { userId: initiatorUserId, currency: toCurrency } });
      if (!fromAcc || !toAcc) throw new NotFoundException('Accounts not found');

      // lock both
      await tx.account.update({ where: { id: fromAcc.id }, data: { balance: fromAcc.balance } });
      await tx.account.update({ where: { id: toAcc.id }, data: { balance: toAcc.balance } });

      const fromBal = new Decimal(fromAcc.balance.toString());
      if (fromBal.lt(amount)) throw new BadRequestException('INSUFFICIENT_FUNDS');

      const txEnvelope = await tx.transaction.create({
        data: {
          type: 'exchange', status: 'committed',
          initiatorUserId, baseCurrency: fromCurrency, amount: amount.toNumber(),
          meta: { rate: rate.toNumber(), toCurrency, converted: converted2.toNumber() },
        },
      });

      // DOUBLE-ENTRY within same user
      await tx.ledger.createMany({
        data: [
          { transactionId: txEnvelope.id, accountId: fromAcc.id, currency: fromCurrency, amount: amount.neg().toNumber() },
          { transactionId: txEnvelope.id, accountId: toAcc.id,   currency: toCurrency,   amount: converted2.toNumber() },
        ],
      });

      await tx.account.update({ where: { id: fromAcc.id }, data: { balance: fromBal.minus(amount).toNumber() } });
      await tx.account.update({ where: { id: toAcc.id },   data: { balance: new Decimal(toAcc.balance.toString()).plus(converted2).toNumber() } });

      return txEnvelope;
    }, { isolationLevel: 'Serializable' as any });

    if (idem) {
      await this.prisma.idempotencyKey.update({
        where: { id: idem.id },
        data: { status: 'completed', transactionId: result.id, responseJson: result },
      });
    }
    return result;
  }
}
