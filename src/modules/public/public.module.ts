import { Module } from '@nestjs/common';
import { PublicController } from './public.controller';
import { PublicMenuService } from './public-menu.service';
import { PublicAnalyticsService } from './public-analytics.service';

@Module({
  controllers: [PublicController],
  providers: [PublicMenuService, PublicAnalyticsService],
  exports: [PublicMenuService],
})
export class PublicModule {}
