import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as QRCode from 'qrcode';
import { MenusService } from '../menus/menus.service';
import { RequestUser } from '../auth/jwt.strategy';

export interface QrResult {
  /** URL that the QR code points to (for display or linking) */
  url: string;
  /** QR code as PNG base64 data URL (data:image/png;base64,...) */
  dataUrl: string;
  /** Optional: raw PNG buffer for download */
  pngBuffer?: Buffer;
}

@Injectable()
export class QrService {
  constructor(
    private readonly config: ConfigService,
    private readonly menusService: MenusService,
  ) {}

  private getMenuBaseUrl(): string {
    const base =
      this.config.get<string>('QR_MENU_BASE_URL') ||
      this.config.get<string>('FRONTEND_URL') ||
      'http://localhost:5173';
    return base.replace(/\/$/, '');
  }

  /**
   * Build the public URL for viewing a menu (e.g. frontend route).
   */
  getMenuViewUrl(menuId: string): string {
    return `${this.getMenuBaseUrl()}/menu/${menuId}`;
  }

  /**
   * Generate QR code for a menu. Validates that the user can access the menu.
   */
  async generateForMenu(menuId: string, user: RequestUser): Promise<QrResult> {
    await this.menusService.findOne(menuId, user);
    const url = this.getMenuViewUrl(menuId);
    const dataUrl = await QRCode.toDataURL(url, {
      type: 'image/png',
      width: 400,
      margin: 2,
      errorCorrectionLevel: 'M',
    });
    const pngBuffer = await QRCode.toBuffer(url, {
      type: 'png',
      width: 400,
      margin: 2,
      errorCorrectionLevel: 'M',
    });
    return { url, dataUrl, pngBuffer };
  }
}
