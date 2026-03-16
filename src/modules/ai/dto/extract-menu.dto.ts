import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class ExtractMenuDto {
  @ApiProperty({
    example:
      'Burger - 9$\nChicken Pasta - 11$\nCaesar Salad - 7$',
    description: 'Raw menu text to extract items from',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50000)
  menuText: string;
}
