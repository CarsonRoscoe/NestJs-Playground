import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreateCoffeeDto {
  @ApiProperty({ description: 'The name of a coffee.' })
  @IsString()
  readonly title: string;

  @ApiProperty({ description: 'The brand of a coffee.' })
  @IsString()
  readonly brand: string;

  @ApiProperty({
    description: 'The flavours',
    examples: ['Vanilla', 'Espresso', 'Black'],
  })
  @IsString({ each: true })
  readonly flavours: string[];
}
