import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../auth/auth.decorator';
import { RequestUser } from '../auth/jwt.strategy';
import { CreateAnalyticsEventDto } from './dto/analytics-event.dto';

@ApiTags('analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post('event')
  @ApiOperation({ summary: 'Track analytics event (impression or click)' })
  @ApiResponse({ status: 201, description: 'Event recorded' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  trackEvent(@Body() dto: CreateAnalyticsEventDto, @CurrentUser() user: RequestUser) {
    return this.analyticsService.trackEvent(dto, user);
  }

  @Get('items/:restaurantId')
  @ApiOperation({ summary: 'Get per-item analytics (impressions, clicks, CTR)' })
  @ApiResponse({ status: 200, description: 'Item analytics list' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  getItemsAnalytics(
    @Param('restaurantId') restaurantId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.analyticsService.getItemsAnalytics(restaurantId, user);
  }

  @Get('dashboard/:restaurantId')
  @ApiOperation({ summary: 'Get analytics dashboard summary' })
  @ApiResponse({ status: 200, description: 'Dashboard data' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  getDashboard(
    @Param('restaurantId') restaurantId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.analyticsService.getDashboard(restaurantId, user);
  }
}
