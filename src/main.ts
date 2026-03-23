import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { cleanupOpenApiDoc } from 'nestjs-zod';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const logger = app.get(Logger);
  const configService = app.get(ConfigService);
  const APP_NAME = configService.getOrThrow<string>('APP_NAME');
  const PORT = configService.getOrThrow<number>('PORT');

  app.useLogger(logger);

  // Security middleware
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
    }),
  );

  // API prefix
  app.setGlobalPrefix('api/v1');

  // Swagger Documentation
  const openApiDoc = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Current-NG API')
      .setDescription('The API Documentation for Current-NG')
      .setVersion('1.0.0')
      .addTag('')
      .build(),
  );

  SwaggerModule.setup('docs', app, cleanupOpenApiDoc(openApiDoc), {
    useGlobalPrefix: false,
  });

  await app.listen(PORT);

  logger.log(`${APP_NAME} server listening on port:${PORT}`);
}

bootstrap();
