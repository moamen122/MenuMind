import { Controller, Post, Get, Patch, Body, Param, UseGuards, NotFoundException } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CostCalculatorService } from './cost-calculator.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../auth/auth.decorator';
import { RequestUser } from '../auth/jwt.strategy';
import { CalculateCostBodyDto } from './dto/cost-ingredient.dto';
import { CostEstimateRequestDto } from './dto/cost-estimate-request.dto';
import { UpdateCostEstimateDto } from './dto/update-cost-estimate.dto';

@ApiTags('cost-calculator')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cost-calculator')
export class CostCalculatorController {
  constructor(private readonly costCalculatorService: CostCalculatorService) {}

  @Get('estimate/menu-item/:menuItemId')
  @ApiOperation({ summary: 'Get saved cost estimate for a menu item' })
  @ApiResponse({ status: 200, description: 'Saved cost estimate (estimation cost with date)' })
  @ApiResponse({ status: 404, description: 'Menu item not found or no estimate saved yet' })
  async getSavedEstimate(
    @Param('menuItemId') menuItemId: string,
    @CurrentUser() user: RequestUser,
  ) {
    const estimate = await this.costCalculatorService.getSavedCostEstimate(menuItemId, user);
    if (!estimate) {
      throw new NotFoundException({
        success: false,
        error: { message: 'No cost estimate saved for this item', code: 'NOT_FOUND' },
      });
    }
    return estimate;
  }

  @Post('estimate')
  @ApiOperation({ summary: 'Fetch cost estimate from DeepSeek and save to DB (current-day pricing)' })
  @ApiResponse({ status: 200, description: 'Cost estimate saved and returned' })
  @ApiResponse({ status: 404, description: 'Menu item not found' })
  @ApiResponse({ status: 503, description: 'DeepSeek API unavailable or missing API key' })
  fetchAndSaveEstimate(
    @Body() dto: CostEstimateRequestDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.costCalculatorService.fetchAndSaveCostEstimate(
      dto.menuItemId,
      user,
      dto.language,
      dto.size,
    );
  }

  @Patch('estimate/menu-item/:menuItemId')
  @ApiOperation({ summary: 'Save edited cost estimate ingredients (e.g. base prices)' })
  @ApiResponse({ status: 200, description: 'Cost estimate updated and returned' })
  @ApiResponse({ status: 404, description: 'Menu item not found or no estimate saved yet' })
  async saveEstimate(
    @Param('menuItemId') menuItemId: string,
    @Body() dto: UpdateCostEstimateDto,
    @CurrentUser() user: RequestUser,
  ) {
    const result = await this.costCalculatorService.updateSavedEstimateIngredients(
      menuItemId,
      user,
      dto.ingredients,
    );
    if (!result) {
      throw new NotFoundException({
        success: false,
        error: { message: 'No cost estimate saved for this item. Get or refresh estimate first.', code: 'NOT_FOUND' },
      });
    }
    return result;
  }

  @Post('menu-item/:menuItemId')
  @ApiOperation({ summary: 'Calculate food cost for a menu item' })
  @ApiResponse({ status: 200, description: 'Cost calculation result' })
  @ApiResponse({ status: 404, description: 'Menu item not found' })
  calculate(
    @Param('menuItemId') menuItemId: string,
    @Body() body: CalculateCostBodyDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.costCalculatorService.calculateForMenuItem(
      menuItemId,
      body.ingredients,
      user,
    );
  }
}
