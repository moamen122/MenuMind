/**
 * Abstraction for AI providers so they can be swapped (OpenAI, Anthropic, etc.)
 */
export interface ExtractedMenuItem {
  name: string;
  price: number;
  category: string;
  size?: string | null;
  description?: string | null;
  image?: string | null;
}

export type MenuLanguage = 'ar' | 'en';

export interface ExtractedMenuResult {
  menu_language?: MenuLanguage;
  items: ExtractedMenuItem[];
}

export interface SuggestedIngredient {
  name: string;
  quantity: string;
}

export interface SuggestIngredientsResult {
  ingredients: SuggestedIngredient[];
}

export interface IAiProvider {
  /**
   * Extract structured menu items from raw menu text.
   */
  extractMenu(menuText: string): Promise<ExtractedMenuResult>;

  /**
   * Extract structured menu items from an image (base64 data URL).
   * Used for image/PDF uploads with Vision (e.g. gpt-4o).
   */
  extractMenuFromImage?(imageBase64: string): Promise<ExtractedMenuResult>;

  /**
   * Suggest ingredients for a dish by name.
   */
  suggestIngredients(dishName: string): Promise<SuggestIngredientsResult>;
}

export const AI_PROVIDER_TOKEN = Symbol('AI_PROVIDER');
