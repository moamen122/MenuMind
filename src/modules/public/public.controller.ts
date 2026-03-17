import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PublicMenuService, PublicMenuResponse } from './public-menu.service';
import { PublicAnalyticsService } from './public-analytics.service';
import { MenuAnalyticsDto } from './dto/menu-analytics.dto';

@ApiTags('public')
@Controller('public')
export class PublicController {
  constructor(
    private readonly publicMenuService: PublicMenuService,
    private readonly publicAnalyticsService: PublicAnalyticsService,
  ) {}

  @Get('menu/:restaurantSlug')
  @ApiOperation({ summary: 'Get public menu by restaurant slug (no auth)' })
  @ApiResponse({ status: 200, description: 'Restaurant, categories, and items' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async getMenu(
    @Param('restaurantSlug') restaurantSlug: string,
  ): Promise<PublicMenuResponse> {
    return this.publicMenuService.getBySlug(restaurantSlug);
  }

  @Post('menu/:restaurantSlug/analytics')
  @ApiOperation({ summary: 'Record menu analytics event (no auth)' })
  @ApiResponse({ status: 201, description: 'Event recorded' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async recordAnalytics(
    @Param('restaurantSlug') restaurantSlug: string,
    @Body() dto: MenuAnalyticsDto,
  ) {
    return this.publicAnalyticsService.recordEvent(restaurantSlug, dto);
  }
}
