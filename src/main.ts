import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const cfg = app.get(ConfigService);
  app.enableCors();

  const docConfig = new DocumentBuilder()
    .setTitle('Kolade Bank API')
    .setDescription('Mini banking platform API')
    .setVersion('1.0.0')
    .addBearerAuth()
    .addApiKey({ type: 'apiKey', name: 'x-api-key', in: 'header' }, 'x-api-key')
    .build();
  const document = SwaggerModule.createDocument(app, docConfig);
  SwaggerModule.setup('docs', app, document);

  const port = cfg.get<number>('PORT') || 3000;
  await app.listen(port);
  console.log(`API running on http://localhost:${port} (docs at /docs)`);
}
bootstrap();
