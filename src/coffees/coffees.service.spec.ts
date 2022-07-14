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
import { CreateCoffeeDto } from './dto/create-coffee.dto';
import { UpdateCoffeeDto } from './dto/update-coffee.dto';

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

  describe('findAll', () => {
    describe('when coffee exists', () => {
      it('should return all the coffee objects', async () => {
        coffeeRepository.find.mockReturnValue([{}]);
        expect(await service.findAll({})).toEqual([{}]);
      });
    });
    describe('when no coffee exists for a ID', () => {
      it('should return empty', async () => {
        coffeeRepository.find.mockReturnValue([]);
        expect(await service.findAll({})).toEqual([]);
      });
    });
    describe('when called with pagination arguments', () => {
      it('should transform args to skip and take, and request flavours as relation', async () => {
        const findSpy = jest.spyOn(coffeeRepository, 'find');
        await service.findAll({ limit: 5, offset: 10 });
        expect(findSpy).toBeCalledWith({
          relations: {
            flavours: true,
          },
          skip: 10,
          take: 5,
        });
      });
    });
  });

  describe('findOne', () => {
    describe('when coffee with ID exists', () => {
      it('should return the coffee object', async () => {
        coffeeRepository.findOne.mockReturnValue({});
        expect(await service.findOne('1')).toEqual({});
      });
      it('should transform id into a where clause', async () => {
        coffeeRepository.findOne.mockReturnValue({});
        const findOneSpy = jest.spyOn(coffeeRepository, 'findOne');
        await service.findOne('1');
        expect(findOneSpy).toBeCalledWith({
          where: { id: 1 },
          relations: {
            flavours: true,
          },
        });
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

  describe('create', () => {
    const createCoffeeDto: CreateCoffeeDto = {
      title: 'Coffee',
      brand: 'Coffee Inc.',
      flavours: ['Vanilla'],
    };
    const flavourEntity: Flavour = {
      id: 0,
      name: 'Vanilla',
      coffees: [],
    };
    const coffeeEntity: Coffee = {
      ...createCoffeeDto,
      id: 0,
      description: '',
      recommendations: 0,
      flavours: [flavourEntity],
    };

    describe('when creating a coffee', () => {
      it('should return a coffee object', async () => {
        coffeeRepository.create.mockReturnValue(coffeeEntity);
        coffeeRepository.save.mockReturnValue(coffeeEntity);
        expect(await service.create(createCoffeeDto)).toEqual(coffeeEntity);
      });
      it('should create related flavours', async () => {
        coffeeRepository.create.mockReturnValue(coffeeEntity);
        coffeeRepository.save.mockReturnValue(coffeeEntity);
        expect((await service.create(createCoffeeDto)).flavours[0]).toEqual(
          flavourEntity,
        );
      });
    });
  });
  describe('update', () => {
    const coffeeEntity: Coffee = {
      title: 'Coffee',
      brand: 'Coffee Inc.',
      flavours: [],
      id: 0,
      description: '',
      recommendations: 0,
    };
    const flavourEntity: Flavour = {
      id: 0,
      name: 'Vanilla',
      coffees: [],
    };
    const updateCoffeeName: UpdateCoffeeDto = {
      title: 'Good Coffee',
      flavours: [],
    };
    const updateCoffeeFlavour: UpdateCoffeeDto = {
      flavours: ['Vanilla'],
    };

    describe('when updating a coffee', () => {
      it('should update a coffee if it exists', async () => {
        coffeeRepository.preload.mockImplementation((coffee) => ({
          ...coffeeEntity,
          ...coffee,
        }));
        coffeeRepository.save.mockImplementation((coffee) => coffee);
        expect(await service.update('0', updateCoffeeName)).toEqual({
          ...coffeeEntity,
          title: updateCoffeeName.title,
        });
      });
      it('should update flavours if in the dto', async () => {
        flavourRepository.findOne.mockReturnValue(flavourEntity);
        coffeeRepository.preload.mockImplementation((coffee) => ({
          ...coffeeEntity,
          ...coffee,
        }));
        coffeeRepository.save.mockImplementation((coffee) => coffee);
        expect(await service.update('0', updateCoffeeFlavour)).toEqual({
          ...coffeeEntity,
          flavours: [flavourEntity],
        });
      });
      it('should throw if no coffee exists', async () => {
        try {
          await service.update('0', updateCoffeeName);
          expect(false);
        } catch (e) {
          expect(e).toBeInstanceOf(HttpException);
          expect(e.message).toEqual(`Coffee 0 not found`);
        }
      });
    });
  });
});
