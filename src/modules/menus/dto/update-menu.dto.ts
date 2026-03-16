import { PartialType } from '@nestjs/swagger';
import { CreateMenuDto } from './create-menu.dto';
import { OmitType } from '@nestjs/swagger';

export class UpdateMenuDto extends PartialType(
  OmitType(CreateMenuDto, ['restaurantId'] as const),
) {}
