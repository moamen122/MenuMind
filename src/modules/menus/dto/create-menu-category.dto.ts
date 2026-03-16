import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsUUID, IsInt, Min, IsOptional, MaxLength, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateMenuCategoryDto {
  @ApiProperty()
  @IsUUID()
  menuId: string;

  @ApiProperty({ example: 'Starters' })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  order?: number = 0;
}
