import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsUUID,
  IsArray,
  ValidateNested,
  MaxLength,
  MinLength,
  ArrayMinSize,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MenuItemSizeDto } from './menu-item-size.dto';

export class CreateMenuItemDto {
  @ApiProperty()
  @IsUUID()
  menuId: string;

  @ApiProperty()
  @IsUUID()
  categoryId: string;

  @ApiProperty({ example: 'Margherita Pizza' })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  @ApiProperty({
    type: [MenuItemSizeDto],
    example: [{ name: 'Regular', price: 99 }],
    description: 'At least one size (e.g. Regular, Half Kilo) with price',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => MenuItemSizeDto)
  sizes: MenuItemSizeDto[];

  @ApiPropertyOptional({ description: 'Image URL or base64 data URL. Send null to clear.' })
  @IsOptional()
  @IsString()
  @MaxLength(5_000_000)
  imageUrl?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}
