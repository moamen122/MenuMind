import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateIngredientDto } from './create-ingredient.dto';

export class UpdateIngredientDto extends PartialType(
  OmitType(CreateIngredientDto, ['restaurantId'] as const),
) {}
