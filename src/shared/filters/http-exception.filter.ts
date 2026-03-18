import { Catch, ArgumentsHost, HttpException } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { ZodSerializationException } from 'nestjs-zod';
import { ZodError } from 'zod';
import { PinoLogger } from 'nestjs-pino';

@Catch(HttpException)
export class HttpExceptionFilter extends BaseExceptionFilter {
  constructor(private readonly logger: PinoLogger) {
    super();
  }

  catch(exception: HttpException, host: ArgumentsHost) {
    if (exception instanceof ZodSerializationException) {
      const zodError = exception.getZodError();
      if (zodError instanceof ZodError) {
        this.logger.error(`ZodSerializationException: ${zodError.message}`);
      }
    }
    super.catch(exception, host);
  }
}
