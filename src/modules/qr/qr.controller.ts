import {
  Controller,
  Get,
  Param,
  UseGuards,
  Res,
  Header,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { Response } from 'express';
import { QrService } from './qr.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../auth/auth.decorator';
import { RequestUser } from '../auth/jwt.strategy';

@ApiTags('qr')
@Controller('qr')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class QrController {
  constructor(private readonly qrService: QrService) {}

  @Get('menu/:menuId')
  @ApiOperation({ summary: 'Get QR code data URL and menu link for a menu' })
  @ApiParam({ name: 'menuId', description: 'Menu UUID' })
  @ApiResponse({ status: 200, description: 'QR code data URL and URL' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Menu not found' })
  async getMenuQr(
    @Param('menuId', ParseUUIDPipe) menuId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.qrService.generateForMenu(menuId, user);
  }

  @Get('menu/:menuId/download')
  @ApiOperation({ summary: 'Download QR code as PNG image' })
  @ApiParam({ name: 'menuId', description: 'Menu UUID' })
  @ApiResponse({ status: 200, description: 'PNG file' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Menu not found' })
  @Header('Content-Type', 'image/png')
  @Header('Content-Disposition', 'attachment; filename="menu-qr.png"')
  async downloadMenuQr(
    @Param('menuId', ParseUUIDPipe) menuId: string,
    @CurrentUser() user: RequestUser,
    @Res() res: Response,
  ) {
    const result = await this.qrService.generateForMenu(menuId, user);
    res.send(result.pngBuffer);
  }
}
