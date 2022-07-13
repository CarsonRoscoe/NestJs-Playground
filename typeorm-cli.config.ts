import { Coffee } from './src/coffees/entities/coffee.entity';
import { Flavour } from './src/coffees/entities/flavour.entity';
import { DataSource } from 'typeorm';

export default new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5431,
  username: 'postgres',
  password: 'password',
  database: 'postgres',
  entities: [Coffee, Flavour],
  migrations: [],
});
