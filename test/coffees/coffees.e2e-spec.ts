import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { CoffeesModule } from '../../src/coffees/coffees.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';
import { WrapResponseInterceptor } from '../../src/common/interceptors/wrap-response.interceptor';
import { TimeoutInterceptor } from '../../src/common/interceptors/timeout.interceptor';
import { Coffee } from '../../src/coffees/entities/coffee.entity';
import { CreateCoffeeDto } from '../../src/coffees/dto/create-coffee.dto';
import { Flavour } from '../../src/coffees/entities/flavour.entity';
import { CoffeesController } from '../../src/coffees/coffees.controller';

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let coffeeDto: CreateCoffeeDto = {
    title: "Caronn's brew",
    brand: 'Carson Inc.',
    flavours: ['Vanilla'],
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        CoffeesModule,
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: 'localhost',
          port: 5433,
          username: 'postgres',
          password: 'password',
          database: 'postgres',
          entities: [Flavour, Coffee],
          synchronize: true,
        }),
      ],
    }).compile();

    app = moduleFixture.createNestApplication();

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

    await app.init();
  });

  it('All should be defined', () => {
    expect(app).toBeDefined();
  });

  it('Get all [GET /]', () => {
    return request(app.getHttpServer())
      .get('/coffees')
      .expect(200)
      .then(({ body }) => {
        expect(body).toBeDefined();
        expect(body.length).toBeDefined();
      });
  });

  it('Create [POST /]', () => {
    return request(app.getHttpServer())
      .post('/coffees/')
      .send(coffeeDto)
      .expect(HttpStatus.CREATED)
      .then(({ body }) => {
        expect(body.title).toEqual(coffeeDto.title);
      });
  });

  it.todo('Get All [GET /]');
  it.todo('Get one [GET /:id]');
  it.todo('Update one [PATCH /:id]');
  it.todo('Delete one [DELETE /:id]');

  afterAll(async () => {
    await app.close();
  });
});
