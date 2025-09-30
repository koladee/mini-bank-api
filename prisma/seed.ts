import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  const users = [
    { email: 'admin@bank.com', role: 'admin' },
    { email: 'kolade@app.com', role: 'user' },
    { email: 'bakare@app.com', role: 'user' },
  ];
  for (const u of users) {
    const passwordHash = await argon2.hash('Password123!', { type: argon2.argon2id });
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { email: u.email, role: u.role as any, passwordHash },
    });
    await prisma.account.upsert({
      where: { userId_currency: { userId: user.id, currency: 'USD' } as any },
      update: {},
      create: { userId: user.id, currency: 'USD', balance: 1000 },
    });
    await prisma.account.upsert({
      where: { userId_currency: { userId: user.id, currency: 'EUR' } as any },
      update: {},
      create: { userId: user.id, currency: 'EUR', balance: 500 },
    });
  }
}
main().finally(() => prisma.$disconnect());
