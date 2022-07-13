import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ApiKeyGuard } from './common/guards/api-key.guard';
import { TimeoutInterceptor } from './common/interceptors/timeout.interceptor';
import { WrapResponseInterceptor } from './common/interceptors/wrap-response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Unwanted properties are removed from a dto
      forbidNonWhitelisted: true, // Error 400 if a unwanted property is detected
      transform: true, // Transform body's into a instance of the DTO. Defaults to just matching the form, but not type
      transformOptions: {
        enableImplicitConversion: true, // DTO data type will transform query param dtos
      },
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new WrapResponseInterceptor());
  app.useGlobalInterceptors(new TimeoutInterceptor());
  await app.listen(3000);
}
bootstrap();
