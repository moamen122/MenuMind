import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateMenuDto {
  @ApiProperty()
  @IsUUID()
  restaurantId: string;

  @ApiProperty({ example: 'Lunch Menu' })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(255)
  name: string;
}
