const { PrismaClient } = require('@prisma/client');
const argon2 = require('argon2');

const prisma = new PrismaClient();

async function main() {
// Adding this to make a change for commit
  await prisma.ledger.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.account.deleteMany();
  await prisma.idempotencyKey.deleteMany().catch(() => {});
  await prisma.user.deleteMany();

  const passwordHash = await argon2.hash('Password123!');

  const [a, b] = await Promise.all([
    prisma.user.create({ data: { email: 'userA@test.com', passwordHash, role: 'user' } }),
    prisma.user.create({ data: { email: 'userB@test.com', passwordHash, role: 'user' } }),
  ]);

  await prisma.account.createMany({
    data: [
      { userId: a.id, currency: 'USD', balance: 1000 },
      { userId: a.id, currency: 'EUR', balance: 500 },
      { userId: b.id, currency: 'USD', balance: 1000 },
      { userId: b.id, currency: 'EUR', balance: 500 },
    ],
  });

  console.log('Test seed complete.');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
