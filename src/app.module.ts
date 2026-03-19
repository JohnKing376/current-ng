import { Module } from '@nestjs/common';
import { AppLoggerModule } from './infrastructure/logger/logger.module';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ZodSerializerInterceptor, ZodValidationPipe } from 'nestjs-zod';
import { HttpExceptionFilter } from './shared/filters/http-exception.filter';
import { AppConfigModule } from './infrastructure/config/config.module';
import { PrismaModule } from './infrastructure/database/prisma/prisma.module';

@Module({
  imports: [AppLoggerModule, AppConfigModule, PrismaModule],
  controllers: [],
  providers: [
    {
      provide: APP_PIPE,
      useClass: ZodValidationPipe,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ZodSerializerInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {}
