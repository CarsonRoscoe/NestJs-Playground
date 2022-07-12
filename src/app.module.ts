import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MiscController } from './misc/misc.controller';
import { CoffeesModule } from './coffees/coffees.module';

@Module({
  imports: [CoffeesModule],
  controllers: [AppController, MiscController],
  providers: [AppService],
})
export class AppModule {}
