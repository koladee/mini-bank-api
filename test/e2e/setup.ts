import { execSync } from 'node:child_process';

function sh(cmd: string) {
  execSync(cmd, { stdio: 'inherit', env: process.env as any });
}

beforeAll(() => {
  process.env.NODE_ENV = 'test';
  process.env.PORT = process.env.PORT || '3100';

  
  sh('npx prisma migrate reset --force --skip-seed');
  
  sh('npx prisma migrate deploy');

  
});

afterAll(() => {
  try {
    sh('npx prisma migrate reset --force --skip-seed');
  } catch {}
});
