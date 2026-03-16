import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsUUID,
  IsEnum,
  MaxLength,
  MinLength,
} from 'class-validator';
import { AnalyticsEventType } from '@prisma/client';

export class CreateAnalyticsEventDto {
  @ApiProperty()
  @IsUUID()
  menuItemId: string;

  @ApiProperty()
  @IsUUID()
  restaurantId: string;

  @ApiProperty({ enum: ['IMPRESSION', 'CLICK'] })
  @IsEnum(['IMPRESSION', 'CLICK'])
  eventType: AnalyticsEventType;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(255)
  sessionId: string;
}
