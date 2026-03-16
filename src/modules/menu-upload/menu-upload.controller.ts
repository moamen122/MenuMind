import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { MenuUploadService } from './menu-upload.service';
import { UploadMenuTextDto } from './dto/upload-menu-text.dto';
import { ExtractFromImageDto } from './dto/extract-from-image.dto';
import { JwtAuthGuard } from '../auth/jwt.guard';

@ApiTags('menu-upload')
@Controller('menu-upload')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MenuUploadController {
  constructor(private readonly menuUploadService: MenuUploadService) {}

  @Post('extract')
  @ApiOperation({
    summary: 'Upload menu text and get extracted structured items',
  })
  @ApiResponse({ status: 200, description: 'Extracted menu items' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async extractFromText(@Body() dto: UploadMenuTextDto) {
    return this.menuUploadService.processMenuText(dto.menuText);
  }

  @Post('extract-from-image')
  @ApiOperation({
    summary: 'Upload menu image (base64) and extract structured items via Vision',
  })
  @ApiResponse({ status: 200, description: 'Extracted menu items' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async extractFromImage(@Body() dto: ExtractFromImageDto) {
    return this.menuUploadService.processImage(dto.imageBase64);
  }
}
