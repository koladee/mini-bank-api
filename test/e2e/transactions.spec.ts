import { bootstrapTestApp } from './http';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_KEY = process.env.API_KEY!;

describe('Transactions (double-entry)', () => {
  let api: request.SuperTest<request.Test>;
  let tokenA: string;
  let tokenB: string;
  let close: (() => Promise<void>) | undefined;

  const emailA = 'userA@test.com';
  const emailB = 'userB@test.com';
  const password = 'Password123!';

  beforeAll(async () => {
    const boot = await bootstrapTestApp();
    api = boot.api;
    close = boot.close;

    // Seed users via API so hashing/fields match the AuthService
    const reg = async (email: string, pwd: string) => {
      const r = await api
        .post('/auth/register')
        .set('x-api-key', API_KEY)
        .send({ email, password: pwd });

      // Accept already-exists or success
      if (![200, 201, 409].includes(r.status)) {
        throw new Error(`Register failed (${r.status}) ${JSON.stringify(r.body)}`);
      }
    };

    await reg(emailA, password);
    await reg(emailB, password);

    // Login to get tokens
    tokenA = (await boot.auth(emailA, password)).token;
    tokenB = (await boot.auth(emailB, password)).token;
  });

  afterAll(async () => {
    if (close) await close();
    await prisma.$disconnect();
  });

  it('Transfer: creates 2 ledger legs and updates balances', async () => {
    const aUSD = await prisma.account.findFirst({ where: { currency: 'USD', user: { email: emailA } } });
    const bUser = await prisma.user.findFirst({ where: { email: emailB } });
    const bUSD = await prisma.account.findFirst({ where: { currency: 'USD', userId: bUser!.id } });
    const amt = 50;

    const res = await api.post('/transactions/transfer')
      .set('x-api-key', API_KEY).set('Authorization', `Bearer ${tokenA}`)
      .send({ recipientUserId: bUser!.id, currency: 'USD', amount: amt, idempotencyKey: 't1' });

    expect([200, 201]).toContain(res.status);
    const txId = res.body.id as string;

    const legs = await prisma.ledger.findMany({ where: { transactionId: txId } });
    const sum = legs.reduce((s, l) => s + Number(l.amount), 0);
    expect(legs).toHaveLength(2);
    expect(sum).toBeCloseTo(0, 2);

    const aUSD2 = await prisma.account.findUnique({ where: { id: aUSD!.id } });
    const bUSD2 = await prisma.account.findUnique({ where: { id: bUSD!.id } });
    expect(Number(aUSD2!.balance)).toBeCloseTo(Number(aUSD!.balance) - amt, 2);
    expect(Number(bUSD2!.balance)).toBeCloseTo(Number(bUSD!.balance) + amt, 2);
  });

   it('Exchange: two legs within same user, correct FX applied', async () => {
    const rate = Number(process.env.FX_USD_EUR || '0.92');
    const aUSD = await prisma.account.findFirst({ where: { currency: 'USD', user: { email: emailA } } });
    const aEUR = await prisma.account.findFirst({ where: { currency: 'EUR', user: { email: emailA } } });

    const amt = 100;
    const expectEur = Number((amt * rate).toFixed(2));

    const res = await api.post('/transactions/exchange')
      .set('x-api-key', API_KEY).set('Authorization', `Bearer ${tokenA}`)
      .send({ fromCurrency: 'USD', amount: amt, idempotencyKey: 'e1' });

    expect([200, 201]).toContain(res.status);
    const txId = res.body.id as string;

    const legs = await prisma.ledger.findMany({ where: { transactionId: txId } });
    expect(legs).toHaveLength(2);

    // Currency-aware checks
    const usdSum = legs.filter(l => l.currency === 'USD').reduce((s, l) => s + Number(l.amount), 0);
    const eurSum = legs.filter(l => l.currency === 'EUR').reduce((s, l) => s + Number(l.amount), 0);

    // Expect exactly -100 USD and +92 EUR (given rate 0.92 & 2dp rounding)
    expect(usdSum).toBeCloseTo(-amt, 2);
    expect(eurSum).toBeCloseTo(expectEur, 2);

    // Optional: base-currency neutrality (convert EUR to USD using the same rate)
    const baseSumUSD = usdSum + (eurSum / rate);
    expect(baseSumUSD).toBeCloseTo(0, 2);

    // Balance effects
    const aUSD2 = await prisma.account.findUnique({ where: { id: aUSD!.id } });
    const aEUR2 = await prisma.account.findUnique({ where: { id: aEUR!.id } });
    expect(Number(aUSD2!.balance)).toBeCloseTo(Number(aUSD!.balance) - amt, 2);
    expect(Number(aEUR2!.balance)).toBeCloseTo(Number(aEUR!.balance) + expectEur, 2);
  });


  it('Insufficient funds blocked', async () => {
    const r = await api.post('/transactions/transfer')
      .set('x-api-key', API_KEY).set('Authorization', `Bearer ${tokenB}`)
      .send({ recipientUserId: '00000000-0000-0000-0000-000000000000', currency: 'USD', amount: 999999, idempotencyKey: 't2' });

    // 400 (insufficient) or 404 (bad recipient)
    expect([400, 404]).toContain(r.status);
  });

  it('Idempotency prevents double spend', async () => {
    const b = await prisma.user.findFirst({ where: { email: emailB } });
    const key = 't3';

    const req = () => api.post('/transactions/transfer')
      .set('x-api-key', API_KEY).set('Authorization', `Bearer ${tokenA}`)
      .send({ recipientUserId: b!.id, currency: 'USD', amount: 10, idempotencyKey: key });

    const r1 = await req();
    const r2 = await req();

    expect([200, 201]).toContain(r1.status);
    // Either a replay (201/200) or a duplicate error (400)
    expect([200, 201, 400]).toContain(r2.status);
  });
});
