import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateMenuWithItemsItemDto } from './create-menu-with-items.dto';

export class ImportMenuItemsDto {
  @ApiProperty({
    type: [CreateMenuWithItemsItemDto],
    description: 'Items extracted from image/text (name, category, sizes, imageUrl)',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateMenuWithItemsItemDto)
  items: CreateMenuWithItemsItemDto[];

  @ApiPropertyOptional({
    description: 'If true, replace all current menu items and categories with the imported items. If false, add items to the current menu.',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  overwrite?: boolean;
}
