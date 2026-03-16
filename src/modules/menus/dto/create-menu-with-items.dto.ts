import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsArray,
  ValidateNested,
  Min,
  MaxLength,
  MinLength,
  ArrayMinSize,
  IsOptional,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateMenuWithItemsSizeDto {
  @ApiProperty({ example: 'Regular', description: 'Size name (e.g. Half Kilo, Regular)' })
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

export class CreateMenuWithItemsItemDto {
  @ApiProperty({ example: 'Grilled Chicken' })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  @ApiProperty({
    type: [CreateMenuWithItemsSizeDto],
    example: [{ name: 'Regular', price: 99 }],
    description: 'At least one size with price',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateMenuWithItemsSizeDto)
  sizes: CreateMenuWithItemsSizeDto[];

  @ApiProperty({ example: 'Main Dishes' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  category: string;

  @ApiPropertyOptional({ description: 'Image URL or data URL' })
  @IsOptional()
  @IsString()
  @MaxLength(500_000)
  imageUrl?: string;
}

export class CreateMenuWithItemsDto {
  @ApiProperty()
  @IsUUID()
  restaurantId: string;

  @ApiProperty({ example: 'Imported Menu' })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  @ApiProperty({ type: [CreateMenuWithItemsItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateMenuWithItemsItemDto)
  items: CreateMenuWithItemsItemDto[];
}
