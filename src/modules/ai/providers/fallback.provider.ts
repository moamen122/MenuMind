import type {
  IAiProvider,
  ExtractedMenuResult,
  SuggestIngredientsResult,
} from './ai-provider.interface';

/**
 * Tries the primary provider first; on any error (e.g. 429 quota), uses the fallback.
 * Lets you test menu extraction even when OpenAI quota is exceeded.
 */
export class FallbackAiProvider implements IAiProvider {
  constructor(
    private readonly primary: IAiProvider,
    private readonly fallback: IAiProvider,
  ) {}

  async extractMenu(menuText: string): Promise<ExtractedMenuResult> {
    try {
      return await this.primary.extractMenu(menuText);
    } catch {
      return await this.fallback.extractMenu(menuText);
    }
  }

  async extractMenuFromImage(imageBase64: string): Promise<ExtractedMenuResult> {
    if (this.primary.extractMenuFromImage) {
      try {
        return await this.primary.extractMenuFromImage(imageBase64);
      } catch {
        if (this.fallback.extractMenuFromImage) {
          return await this.fallback.extractMenuFromImage(imageBase64);
        }
      }
    }
    if (this.fallback.extractMenuFromImage) {
      return await this.fallback.extractMenuFromImage(imageBase64);
    }
    return { items: [] };
  }

  async suggestIngredients(dishName: string): Promise<SuggestIngredientsResult> {
    try {
      return await this.primary.suggestIngredients(dishName);
    } catch {
      return await this.fallback.suggestIngredients(dishName);
    }
  }
}
