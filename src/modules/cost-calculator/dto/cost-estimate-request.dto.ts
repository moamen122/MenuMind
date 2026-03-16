import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsUUID, IsIn, IsOptional } from 'class-validator';

export class CostEstimateRequestDto {
  @ApiProperty({ description: 'Menu item ID. Fetches dish name from item, calls DeepSeek, saves estimate to DB.' })
  @IsUUID()
  @IsNotEmpty()
  menuItemId: string;

  @ApiPropertyOptional({ description: 'Language for ingredient names and text (ar = Arabic, en = English). Must match web app language.', enum: ['ar', 'en'] })
  @IsOptional()
  @IsString()
  @IsIn(['ar', 'en'])
  language?: 'ar' | 'en';

  @ApiPropertyOptional({ description: 'Size/variant to estimate (e.g. "Medium", "نص كيلو"). Quantities will be for one serving of this size. Use "Regular" or "1 person" when item has no sizes.' })
  @IsOptional()
  @IsString()
  size?: string;
}
