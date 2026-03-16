import { IsOptional, IsUUID } from 'class-validator';

/**
 * Example base DTO showing class-validator usage.
 * Use as reference when implementing module DTOs.
 */
export class BaseIdParamDto {
  @IsUUID()
  id: string;
}

export class PaginationQueryDto {
  @IsOptional()
  page?: number = 1;

  @IsOptional()
  limit?: number = 10;
}
