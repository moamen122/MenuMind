import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsIn, IsOptional, IsUUID } from 'class-validator';

export class MenuAnalyticsDto {
  @ApiProperty({ enum: ['menu_view', 'item_view', 'category_view'] })
  @IsString()
  @IsIn(['menu_view', 'item_view', 'category_view'])
  eventType: 'menu_view' | 'item_view' | 'category_view';

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  itemId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  categoryId?: string;
}
