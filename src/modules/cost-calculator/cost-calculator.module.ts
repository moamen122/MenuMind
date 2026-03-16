import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CostCalculatorController } from './cost-calculator.controller';
import { CostCalculatorService } from './cost-calculator.service';
import { DeepSeekCostEstimateService } from './deepseek-cost-estimate.service';
import { RestaurantsModule } from '../restaurants/restaurants.module';

@Module({
  imports: [ConfigModule, RestaurantsModule],
  controllers: [CostCalculatorController],
  providers: [CostCalculatorService, DeepSeekCostEstimateService],
  exports: [CostCalculatorService],
})
export class CostCalculatorModule {}
