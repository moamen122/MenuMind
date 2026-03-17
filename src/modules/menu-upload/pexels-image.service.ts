import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const PEXELS_SEARCH_URL = 'https://api.pexels.com/v1/search';
const PEXELS_PER_PAGE = 30;

/** Query suffix to bias results toward food on the plate, not people or places. */
const FOOD_QUERY_SUFFIX = ' dish food';

/** Alt text must contain at least one of these to be considered a food image. */
const FOOD_ALT_KEYWORDS = [
  'food',
  'dish',
  'meal',
  'plate',
  'cuisine',
  'cooking',
  'recipe',
  'serving',
  'restaurant',
  'delicious',
  'pastry',
  'dessert',
  'ingredient',
  'breakfast',
  'lunch',
  'dinner',
  'grilled',
  'roasted',
  'salad',
  'soup',
  'kebab',
  'meat',
  'chicken',
  'vegetable',
];

/** If alt contains any of these, reject (people/portraits/lifestyle, not the dish). */
const ALT_REJECT_KEYWORDS = [
  'person',
  'people',
  'man',
  'woman',
  'child',
  'chef',
  'portrait',
  'face',
  'smiling',
  'holding',
  'crowd',
  'team',
  'family',
  'friend',
  'couple',
  'hands holding',
  'woman holding',
  'man holding',
  'chef holding',
  'cooking together',
  'eating at',
  'sitting at table',
  'at restaurant table',
  'outdoor',
  'lifestyle',
];

interface PexelsPhotoSrc {
  medium?: string;
  large?: string;
  original?: string;
}

interface PexelsPhoto {
  src?: PexelsPhotoSrc;
  alt?: string | null;
}

interface PexelsSearchResponse {
  photos?: PexelsPhoto[];
}

@Injectable()
export class PexelsImageService {
  private readonly logger = new Logger(PexelsImageService.name);
  private readonly apiKey: string | undefined;

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>('PEXELS_API_KEY');
    if (!this.apiKey?.trim()) {
      this.logger.warn(
        'PEXELS_API_KEY is not set — extract-from-image will return items with image: null. Set it in Vercel env for production.',
      );
    }
  }

  private isRejectedByAlt(alt: string): boolean {
    const lower = alt.toLowerCase();
    return ALT_REJECT_KEYWORDS.some((keyword) => lower.includes(keyword));
  }

  /**
   * Returns true only if alt suggests a food/dish image and does not suggest people/portrait.
   */
  private isLikelyFoodPhoto(photo: PexelsPhoto): boolean {
    const alt = (photo?.alt ?? '').trim();
    if (alt.length < 3) return false;
    const lower = alt.toLowerCase();
    if (this.isRejectedByAlt(lower)) return false;
    return FOOD_ALT_KEYWORDS.some((keyword) => lower.includes(keyword));
  }

  /**
   * Build a search query that emphasizes dish/food to reduce wrong results.
   */
  private buildSearchQuery(itemName: string): string {
    const base = itemName.trim().replace(/\s+/g, ' ').slice(0, 80);
    const lower = base.toLowerCase();
    if (lower.includes('food') || lower.includes('dish') || lower.includes('meal')) {
      return `${base} dish`;
    }
    return `${base}${FOOD_QUERY_SUFFIX}`;
  }

  /**
   * Search Pexels with food context; return the first result that looks like a dish
   * (not people/portraits). Returns null if no suitable image is found.
   */
  async searchFirstImageUrl(query: string): Promise<string | null> {
    if (!this.apiKey || !query?.trim()) return null;

    const searchQuery = this.buildSearchQuery(query);

    try {
      const url = new URL(PEXELS_SEARCH_URL);
      url.searchParams.set('query', searchQuery);
      url.searchParams.set('per_page', String(PEXELS_PER_PAGE));

      const res = await fetch(url.toString(), {
        headers: { Authorization: this.apiKey },
      });
      if (!res.ok) return null;

      const data = (await res.json()) as PexelsSearchResponse;
      const photos = data.photos ?? [];

      for (const photo of photos) {
        if (this.isLikelyFoodPhoto(photo)) {
          const src = photo.src;
          return src?.medium || src?.large || src?.original || null;
        }
      }

      return null;
    } catch {
      return null;
    }
  }
}
