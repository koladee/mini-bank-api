import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module';

export async function bootstrapTestApp(): Promise<{
  app: INestApplication;
  api: request.SuperTest<request.Test>;
  auth: (email: string, password: string) => Promise<{ token: string }>;
  close: () => Promise<void>;
}> {
  const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = mod.createNestApplication();
  await app.init();
  const server = app.getHttpServer();
  const api = request(server);

  const auth = async (email: string, password: string) => {
    const r = await api
      .post('/auth/login')
      .set('x-api-key', process.env.API_KEY!)
      .send({ email, password });

    if (![200, 201].includes(r.status)) {
      throw new Error(`Login failed (${r.status}) ${JSON.stringify(r.body)}`);
    }
    const token = r.body?.access_token || r.body?.accessToken || r.body?.token;
    if (!token) throw new Error(`No token in login response: ${JSON.stringify(r.body)}`);
    return { token };
  };

  const close = async () => app.close();

  return { app, api, auth, close };
}
