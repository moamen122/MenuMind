import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, Min, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class MenuItemSizeDto {
  @ApiProperty({ example: 'Regular', description: 'Size name (e.g. Half Kilo, Large, Regular)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 99 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price: number;
}
