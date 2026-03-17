import {
  Injectable,
  Logger,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { AiService } from '../ai/ai.service';
import type {
  ExtractedMenuResult,
  ExtractedMenuItem,
} from '../ai/providers/ai-provider.interface';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { TranslateService } from './translate.service';
import { PexelsImageService } from './pexels-image.service';
import {
  normalizeExtractedItems,
  type NormalizedMenuItem,
} from './normalize-extracted-menu';
import type { MenuLanguage } from '../ai/providers/ai-provider.interface';

const AI_NO_RESULT_MESSAGE =
  'OpenAI could not extract menu items. Please check your input and try again, or there may be a temporary issue with the AI service.';

export interface MenuUploadResult {
  menu_language?: MenuLanguage;
  items: NormalizedMenuItem[];
}

const CACHE_PREFIX_TEXT = 'text:';
const CACHE_PREFIX_IMAGE = 'image:';

@Injectable()
export class MenuUploadService {
  private readonly logger = new Logger(MenuUploadService.name);

  constructor(
    private readonly aiService: AiService,
    private readonly prisma: PrismaService,
    private readonly translate: TranslateService,
    private readonly pexels: PexelsImageService,
  ) {}

  private static cacheKey(prefix: string, input: string): string {
    const normalized =
      prefix === CACHE_PREFIX_TEXT ? input.trim() : input;
    const hash = createHash('sha256').update(normalized, 'utf8').digest('hex');
    return `${prefix}${hash}`;
  }

  private parseCachedItems(items: unknown): ExtractedMenuItem[] {
    if (Array.isArray(items)) {
      return items as ExtractedMenuItem[];
    }
    return [];
  }

  /**
   * Attach Pexels image URLs to items. Translation is used ONLY for the image
   * search query when menu_language is "ar" (Pexels works better with English).
   * Item names and categories are never changed—menu language is preserved.
   * Each item is enriched in a per-item try/catch so one failure does not zero out all images.
   */
  private async enrichWithImages(
    result: ExtractedMenuResult,
  ): Promise<ExtractedMenuResult> {
    const menu_language = result.menu_language;
    const items = (result.items ?? []).map((it) => ({
      ...it,
      image: (it.image ?? null) as string | null,
    }));

    const pexelsConfigured = this.pexels.isConfigured();
    this.logger.log(
      `Image enrichment: PEXELS_API_KEY configured=${pexelsConfigured}, items=${items.length}`,
    );
    if (!pexelsConfigured) {
      return { menu_language: result.menu_language, items };
    }

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const name = item?.name ?? '';
      try {
        const searchQuery =
          menu_language === 'ar'
            ? await this.translate.translateArToEn(name)
            : name;
        const imageUrl = await this.pexels.searchFirstImageUrl(searchQuery);
        items[i] = { ...item, image: imageUrl ?? null };
      } catch (err) {
        this.logger.warn(
          `Image enrichment failed for item "${name}"`,
          err instanceof Error ? err.message : err,
        );
        items[i] = { ...item, image: null };
      }
    }

    return { menu_language: result.menu_language, items };
  }

  private async toUploadResult(result: ExtractedMenuResult): Promise<MenuUploadResult> {
    const enriched = await this.enrichWithImages(result);
    const items = normalizeExtractedItems(enriched.items);
    return { menu_language: enriched.menu_language, items };
  }

  /**
   * Process raw menu text: check cache first, then AI. Returns normalized items (one per base name with sizes array).
   */
  async processMenuText(menuText: string): Promise<MenuUploadResult> {
    const key = MenuUploadService.cacheKey(CACHE_PREFIX_TEXT, menuText);
    const cached = await this.prisma.menuExtractionCache.findUnique({
      where: { cacheKey: key },
    });
    if (cached?.items) {
      const items = this.parseCachedItems(cached.items);
      if (items.length > 0) {
        return this.toUploadResult({ menu_language: undefined, items });
      }
    }

    const result = await this.aiService.extractMenu(menuText);
    if (!result?.items?.length) {
      throw new BadRequestException({
        success: false,
        error: {
          message: AI_NO_RESULT_MESSAGE,
          code: 'AI_NO_RESULT',
        },
      });
    }
    await this.prisma.menuExtractionCache.upsert({
      where: { cacheKey: key },
      create: { cacheKey: key, items: result.items as object },
      update: { items: result.items as object },
    });
    return this.toUploadResult(result);
  }

  /**
   * Process image (base64): check cache first, then AI Vision. Returns normalized items (one per base name with sizes array).
   */
  async processImage(imageBase64: string): Promise<MenuUploadResult> {
    try {
      const key = MenuUploadService.cacheKey(CACHE_PREFIX_IMAGE, imageBase64);
      const cached = await this.prisma.menuExtractionCache.findUnique({
        where: { cacheKey: key },
      });
      if (cached?.items) {
        const items = this.parseCachedItems(cached.items);
        if (items.length > 0) {
          return this.toUploadResult({ menu_language: undefined, items });
        }
      }

      const result = await this.aiService.extractMenuFromImage(imageBase64);
      if (!result?.items?.length) {
        throw new BadRequestException({
          success: false,
          error: {
            message: AI_NO_RESULT_MESSAGE,
            code: 'AI_NO_RESULT',
          },
        });
      }
      await this.prisma.menuExtractionCache.upsert({
        where: { cacheKey: key },
        create: { cacheKey: key, items: result.items as object },
        update: { items: result.items as object },
      });
      return this.toUploadResult(result);
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      const message =
        err instanceof Error ? err.message : 'Extract from image failed';
      this.logger.error(`processImage error: ${message}`, err instanceof Error ? err.stack : undefined);
      throw new InternalServerErrorException({
        success: false,
        error: {
          message:
            process.env.NODE_ENV === 'production'
              ? 'OpenAI encountered an issue. Please try again.'
              : message,
          code: 'AI_ERROR',
        },
      });
    }
  }
}
