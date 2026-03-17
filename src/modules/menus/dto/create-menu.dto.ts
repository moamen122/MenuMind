import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsUUID, MaxLength, MinLength, IsOptional } from 'class-validator';

export class CreateMenuDto {
  @ApiPropertyOptional({ description: 'Omitted when user is the restaurant (single context)' })
  @IsOptional()
  @IsUUID()
  restaurantId?: string;

  @ApiProperty({ example: 'Lunch Menu' })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(255)
  name: string;
}
