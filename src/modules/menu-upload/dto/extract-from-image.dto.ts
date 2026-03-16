import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class ExtractFromImageDto {
  @ApiProperty({
    description:
      'Image as base64 data URL (e.g. data:image/png;base64,...) or raw base64 string',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10_000_000)
  imageBase64: string;
}
