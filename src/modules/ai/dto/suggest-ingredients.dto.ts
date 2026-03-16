import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class SuggestIngredientsDto {
  @ApiProperty({
    example: 'Chicken Burger',
    description: 'Name of the dish to get ingredient suggestions for',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  dishName: string;
}
