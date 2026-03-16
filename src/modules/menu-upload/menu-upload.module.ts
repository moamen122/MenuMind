import { Module } from '@nestjs/common';
import { MenuUploadController } from './menu-upload.controller';
import { MenuUploadService } from './menu-upload.service';
import { TranslateService } from './translate.service';
import { PexelsImageService } from './pexels-image.service';
import { AiModule } from '../ai/ai.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AiModule, AuthModule],
  controllers: [MenuUploadController],
  providers: [MenuUploadService, TranslateService, PexelsImageService],
  exports: [MenuUploadService],
})
export class MenuUploadModule {}
