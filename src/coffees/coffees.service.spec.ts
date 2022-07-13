import { any } from '@hapi/joi';
import { HttpException } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  createMockRepositoryProvider,
  MockRepository,
} from '../common/test/mock-repository';
import { DataSource, Repository } from 'typeorm';
import coffeesConfig from './coffees.config';
import { CoffeesService } from './coffees.service';
import { COFFEE_BRANDS } from './constants/titles';
import { Coffee } from './entities/coffee.entity';
import { Flavour } from './entities/flavour.entity';

describe('CoffeesService', () => {
  let service: CoffeesService;
  let coffeeRepository: MockRepository;
  let flavourRepository: MockRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forFeature(coffeesConfig)],
      providers: [
        CoffeesService,
        { provide: DataSource, useValue: {} },
        createMockRepositoryProvider(Coffee),
        createMockRepositoryProvider(Flavour),
        {
          provide: COFFEE_BRANDS,
          useFactory: () => ['Carson Inc.', 'Jaegar Inc.'],
          inject: [],
        },
      ],
    }).compile();

    service = module.get<CoffeesService>(CoffeesService);
    coffeeRepository = module.get<MockRepository>(getRepositoryToken(Coffee));
    flavourRepository = module.get<MockRepository>(getRepositoryToken(Flavour));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOne', () => {
    describe('when coffee with ID exists', () => {
      it('should return the coffee object', async () => {
        coffeeRepository.findOne.mockReturnValue({});
        expect(await service.findOne('1')).toEqual({});
      });
    });
    describe('when no coffee exists for a ID', () => {
      it('should throw', async () => {
        coffeeRepository.findOne.mockReturnValue(undefined);
        try {
          await service.findOne('1');
        } catch (e) {
          expect(e).toBeInstanceOf(HttpException);
          expect(e.message).toEqual(`Coffee 1 not found`);
        }
      });
    });
  });
});
