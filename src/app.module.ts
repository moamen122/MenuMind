import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { configValidationSchema } from './config/config.schema';
import { DatabaseModule } from './infrastructure/database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { RestaurantsModule } from './modules/restaurants/restaurants.module';
import { MenusModule } from './modules/menus/menus.module';
import { MenuItemsModule } from './modules/menu-items/menu-items.module';
import { IngredientsModule } from './modules/ingredients/ingredients.module';
import { CostCalculatorModule } from './modules/cost-calculator/cost-calculator.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AiModule } from './modules/ai/ai.module';
import { MenuUploadModule } from './modules/menu-upload/menu-upload.module';
import { QrModule } from './modules/qr/qr.module';
import { ImagesModule } from './modules/images/images.module';
import { PublicModule } from './modules/public/public.module';
import { AppController } from './app.controller';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

@Module({
  controllers: [AppController],
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validationSchema: configValidationSchema,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    DatabaseModule,
    AuthModule,
    RestaurantsModule,
    MenusModule,
    MenuItemsModule,
    IngredientsModule,
    CostCalculatorModule,
    AnalyticsModule,
    AiModule,
    MenuUploadModule,
    QrModule,
    ImagesModule,
    PublicModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
  ],
})
export class AppModule {}
