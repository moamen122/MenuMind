import { Injectable, Inject } from '@nestjs/common';
import {
  IAiProvider,
  AI_PROVIDER_TOKEN,
  ExtractedMenuResult,
  SuggestIngredientsResult,
} from './providers/ai-provider.interface';

@Injectable()
export class AiService {
  constructor(
    @Inject(AI_PROVIDER_TOKEN) private readonly provider: IAiProvider,
  ) {}

  async extractMenu(menuText: string): Promise<ExtractedMenuResult> {
    return this.provider.extractMenu(menuText);
  }

  async extractMenuFromImage(imageBase64: string): Promise<ExtractedMenuResult> {
    if (this.provider.extractMenuFromImage) {
      return this.provider.extractMenuFromImage(imageBase64);
    }
    return { items: [] };
  }

  async suggestIngredients(dishName: string): Promise<SuggestIngredientsResult> {
    return this.provider.suggestIngredients(dishName);
  }
}
