import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class LogoutDto {
  @ApiPropertyOptional({ description: 'Refresh token to invalidate (if omitted, all refresh tokens for the user are invalidated)' })
  @IsOptional()
  @IsString()
  refreshToken?: string;
}
