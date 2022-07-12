import {
  HttpCode,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { CreateCoffeeDto } from './dto/create-coffee.dto';
import { Coffee } from './entities/Coffee.entity';
import { UpdateCoffeeDto } from './dto/update-coffee.dto';

@Injectable()
export class CoffeesService {
  private coffees: Coffee[] = [
    {
      id: 1,
      name: "Carson's brew",
      brand: 'Carson Inc.',
      flavours: ['chocolate', 'vanilla'],
    },
  ];

  findAll() {
    return this.coffees;
  }

  findOne(id: string) {
    const coffee = this.coffees.find((coffee) => coffee.id === +id);
    if (!coffee) {
      throw new HttpException(`Coffee ${id} not found`, HttpStatus.NOT_FOUND);
    }
    return coffee;
  }

  create(createCoffeeDto: CreateCoffeeDto) {
    this.coffees.push({
      id: Date.now(),
      ...createCoffeeDto,
    });
  }

  update(id: string, updateCoffeeDto: UpdateCoffeeDto) {
    const coffee = this.findOne(id);
    const { name, brand, flavours } = updateCoffeeDto;

    if (!coffee) {
      throw new HttpException(`Coffee ${id} not found`, HttpStatus.NOT_FOUND);
    }

    if (name) coffee.name = name;
    if (brand) coffee.brand = brand;
    if (flavours) coffee.flavours = flavours;
  }

  remove(id: string) {
    const coffeeIndex = this.coffees.findIndex((coffee) => coffee.id === +id);
    if (coffeeIndex >= 0) {
      this.coffees.splice(coffeeIndex, 1);
    }
  }
}
