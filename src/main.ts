import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Unwanted properties are removed from a dto
      forbidNonWhitelisted: true, // Error 400 if a unwanted property is detected
      transform: true, // Transform body's into a instance of the DTO. Defaults to just matching the form, but not type
    }),
  );
  await app.listen(3000);
}
bootstrap();
