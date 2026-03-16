import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { QrService } from './qr.service';
import { QrController } from './qr.controller';
import { MenusModule } from '../menus/menus.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [ConfigModule, MenusModule, AuthModule],
  controllers: [QrController],
  providers: [QrService],
  exports: [QrService],
})
export class QrModule {}
