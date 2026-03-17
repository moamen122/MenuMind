import { Controller, Get, Query, Res, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import type { Response } from 'express';
import { ImagesService } from './images.service';

/** Allowed image hostnames for proxy (avoids open redirect / abuse). */
const ALLOWED_HOSTS = [
  'images.pexels.com',
  'images.unsplash.com',
  'cdn.pexels.com',
  'pexels.com',
  'unsplash.com',
];

@ApiTags('images')
@Controller('images')
export class ImagesController {
  constructor(private readonly imagesService: ImagesService) {}

  @Get('proxy')
  @ApiOperation({ summary: 'Proxy external image URL (for item images in production)' })
  @ApiQuery({ name: 'url', required: true, description: 'Encoded image URL (https only, pexels/unsplash)' })
  async proxy(@Query('url') url: string | undefined, @Res() res: Response) {
    if (!url || typeof url !== 'string') {
      throw new BadRequestException({ message: 'Missing or invalid url' });
    }
    let decoded: string;
    try {
      decoded = decodeURIComponent(url);
    } catch {
      throw new BadRequestException({ message: 'Invalid url encoding' });
    }
    if (!decoded.startsWith('https://')) {
      throw new BadRequestException({ message: 'Only https URLs are allowed' });
    }
    let parsed: URL;
    try {
      parsed = new URL(decoded);
    } catch {
      throw new BadRequestException({ message: 'Invalid url' });
    }
    const host = parsed.hostname.toLowerCase();
    const allowed = ALLOWED_HOSTS.some((h) => host === h || host.endsWith('.' + h));
    if (!allowed) {
      throw new BadRequestException({ message: 'URL host not allowed for proxy' });
    }
    try {
      const result = await this.imagesService.fetchImageBuffer(decoded);
      if (!result) {
        res.status(502).json({ message: 'Failed to fetch image' });
        return;
      }
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.setHeader('Content-Type', result.contentType);
      res.send(result.buffer);
    } catch {
      res.status(502).json({ message: 'Failed to fetch image' });
    }
  }
}
