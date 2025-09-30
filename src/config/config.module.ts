import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        DATABASE_URL: Joi.string().uri().required(),
        JWT_SECRET: Joi.string().min(32).required(),
        ACCESS_TOKEN_TTL: Joi.string().default('30m'),
        REFRESH_TOKEN_TTL: Joi.string().default('7d'),
        API_KEY: Joi.string().min(16).required(),
        FX_USD_EUR: Joi.number().positive().required(),
        NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
        PORT: Joi.number().default(3000),
      }),
    }),
  ],
})
export class AppConfigModule {}
