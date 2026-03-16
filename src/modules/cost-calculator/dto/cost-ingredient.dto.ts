import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min, IsUUID, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CostIngredientDto {
  @ApiProperty()
  @IsUUID()
  ingredientId: string;

  @ApiProperty({ example: 150 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  quantity: number;

  @ApiProperty({ example: 0.25 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitPrice: number;
}

export class CalculateCostBodyDto {
  @ApiProperty({ type: [CostIngredientDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CostIngredientDto)
  ingredients: CostIngredientDto[];
}
