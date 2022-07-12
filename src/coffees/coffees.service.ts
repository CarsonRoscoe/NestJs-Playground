import {
  HttpCode,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import { CreateCoffeeDto } from './dto/create-coffee.dto';
import { Coffee } from './entities/coffee.entity';
import { UpdateCoffeeDto } from './dto/update-coffee.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Flavour } from './entities/flavour.entity';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { Event } from '../../src/events/entities/event.entity';
import { COFFEE_BRANDS } from './constants/titles';
import { ConfigService, ConfigType } from '@nestjs/config';
import appConfig from 'src/config/app.config';
import coffeesConfig from './coffees.config';

@Injectable()
export class CoffeesService {
  constructor(
    @InjectRepository(Coffee)
    private readonly coffeeRepository: Repository<Coffee>,
    @InjectRepository(Coffee)
    private readonly flavourRepository: Repository<Flavour>,
    private readonly dataSource: DataSource,
    @Inject(COFFEE_BRANDS) coffeeBrands: string[],
    @Inject(coffeesConfig.KEY)
    private readonly config: ConfigType<typeof coffeesConfig>,
  ) {}

  findAll(paginationQuery: PaginationQueryDto) {
    return this.coffeeRepository.find({
      relations: {
        flavours: true,
      },
      skip: paginationQuery.offset,
      take: paginationQuery.limit,
    });
  }

  findOne(id: string) {
    const coffee = this.coffeeRepository.findOne({
      where: { id: +id },
      relations: {
        flavours: true,
      },
    });
    if (!coffee) {
      throw new HttpException(`Coffee ${id} not found`, HttpStatus.NOT_FOUND);
    }
    return coffee;
  }

  async create(createCoffeeDto: CreateCoffeeDto) {
    const flavours = await Promise.all(
      createCoffeeDto.flavours.map((name) => this.preloadFlavourByName(name)),
    );

    const coffee = this.coffeeRepository.create({
      ...createCoffeeDto,
      flavours,
    });
    return this.coffeeRepository.save(coffee);
  }

  async update(id: string, updateCoffeeDto: UpdateCoffeeDto) {
    const flavours =
      updateCoffeeDto.flavours &&
      (await Promise.all(
        updateCoffeeDto.flavours.map((name) => this.preloadFlavourByName(name)),
      ));

    const coffee = await this.coffeeRepository.preload({
      id: +id,
      ...updateCoffeeDto,
      flavours,
    });

    if (!coffee) {
      throw new HttpException(`Coffee ${id} not found`, HttpStatus.NOT_FOUND);
    }

    return this.coffeeRepository.save(coffee);
  }

  async recommendCoffee(coffee: Coffee) {
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      coffee.recommendations++;

      const recommendEvent = new Event();
      recommendEvent.name = 'recommend_coffee';
      recommendEvent.type = 'coffee';
      recommendEvent.payload = { coffeeId: coffee.id };

      await queryRunner.manager.save(coffee);
      await queryRunner.manager.save(recommendEvent);

      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
    } finally {
      await queryRunner.release();
    }
  }

  async remove(id: string) {
    const coffee = await this.findOne(id);
    return this.coffeeRepository.remove(coffee);
  }

  private async preloadFlavourByName(name: string): Promise<Flavour> {
    const flavour = await this.flavourRepository.findOne({ where: { name } });
    if (flavour) {
      return flavour;
    }
    return this.flavourRepository.create({ name });
  }
}
