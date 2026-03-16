import {
  Injectable,
  Logger,
  InternalServerErrorException,
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
import { DEFAULT_MENU_ITEMS } from './default-menu-items';
import {
  normalizeExtractedItems,
  type NormalizedMenuItem,
} from './normalize-extracted-menu';
import type { MenuLanguage } from '../ai/providers/ai-provider.interface';

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

  private withFallback(result: ExtractedMenuResult): ExtractedMenuResult {
    if (!result?.items?.length) {
      return { items: DEFAULT_MENU_ITEMS };
    }
    return result;
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
   */
  private async enrichWithImages(
    result: ExtractedMenuResult,
  ): Promise<ExtractedMenuResult> {
    try {
      const menu_language = result.menu_language;
      const items = result.items.map((it) => ({
        ...it,
        image: (it.image ?? null) as string | null,
      }));

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const name = item?.name ?? '';
        // Translate only for search query; item.name stays in original language
        const searchQuery =
          menu_language === 'ar'
            ? await this.translate.translateArToEn(name)
            : name;
        const imageUrl = await this.pexels.searchFirstImageUrl(searchQuery);
        items[i] = { ...item, image: imageUrl ?? null };
      }

      return { menu_language: result.menu_language, items };
    } catch (err) {
      this.logger.warn(
        'Image enrichment failed, returning items without images',
        err instanceof Error ? err.message : err,
      );
      return {
        menu_language: result.menu_language,
        items: result.items.map((it) => ({ ...it, image: null })),
      };
    }
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
    const withDefault = this.withFallback(result);
    if (result?.items?.length) {
      await this.prisma.menuExtractionCache.upsert({
        where: { cacheKey: key },
        create: { cacheKey: key, items: result.items as object },
        update: { items: result.items as object },
      });
    }
    return this.toUploadResult(withDefault);
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
      const withDefault = this.withFallback(result);
      if (result?.items?.length) {
        await this.prisma.menuExtractionCache.upsert({
          where: { cacheKey: key },
          create: { cacheKey: key, items: result.items as object },
          update: { items: result.items as object },
        });
      }
      return this.toUploadResult(withDefault);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Extract from image failed';
      this.logger.error(`processImage error: ${message}`, err instanceof Error ? err.stack : undefined);
      throw new InternalServerErrorException(
        process.env.NODE_ENV === 'production'
          ? 'Failed to process image. Please try again.'
          : message,
      );
    }
  }
}
