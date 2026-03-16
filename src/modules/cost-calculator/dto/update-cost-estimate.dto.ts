import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsIn, IsNumber, IsOptional, IsArray, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateCostEstimateIngredientDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  quantity_needed: string;

  @ApiProperty({ enum: ['liquid', 'solid'] })
  @IsString()
  @IsIn(['liquid', 'solid'])
  unit_type: 'liquid' | 'solid';

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price_per_liter?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price_per_kg?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateCostEstimateDto {
  @ApiProperty({ type: [UpdateCostEstimateIngredientDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateCostEstimateIngredientDto)
  ingredients: UpdateCostEstimateIngredientDto[];
}
