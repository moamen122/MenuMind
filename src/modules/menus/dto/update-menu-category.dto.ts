import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateMenuCategoryDto } from './create-menu-category.dto';

export class UpdateMenuCategoryDto extends PartialType(
  OmitType(CreateMenuCategoryDto, ['menuId'] as const),
) {}
