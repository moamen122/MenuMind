import { Injectable } from '@nestjs/common';
import type {
  IAiProvider,
  ExtractedMenuResult,
  ExtractedMenuItem,
  SuggestIngredientsResult,
} from './ai-provider.interface';

/**
 * Free mock AI provider for testing without an API key.
 * Parses menu text with simple rules (e.g. "Dish Name - 99" or "Dish Name 99 EGP").
 * Set USE_MOCK_AI=true in .env to use this instead of OpenAI.
 */
@Injectable()
export class MockAiProvider implements IAiProvider {
  /**
   * Parse lines like:
   * - "Burger - 9" or "Burger – 9"
   * - "Burger $9" or "Burger 9.99"
   * - "Burger, 9" or "Burger: 9"
   */
  async extractMenu(menuText: string): Promise<ExtractedMenuResult> {
    const items: ExtractedMenuItem[] = [];
    const lines = menuText.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);

    // Patterns: name followed by price (with optional currency or separator)
    const pricePatterns = [
      /^(.+?)\s*[-–—:]\s*(\d+(?:\.\d{1,2})?)\s*(?:EGP|ج\.م)?\s*$/i,  // "Name - 99" or "Name – 99 EGP"
      /^(.+?)\s+(\d+(?:\.\d{1,2})?)\s*(?:EGP|ج\.م)?\s*$/i,             // "Name 99" or "Name 99 EGP"
      /^(.+?)\s*,\s*(\d+(?:\.\d{1,2})?)\s*(?:EGP|ج\.م)?\s*$/i,         // "Name, 99"
    ];

    const categories = new Set<string>();
    let fallbackCategory = 'Main';

    for (const line of lines) {
      let name = '';
      let price = 0;

      for (const re of pricePatterns) {
        const m = line.match(re);
        if (m) {
          name = m[1].trim();
          price = parseFloat(m[2]) || 0;
          break;
        }
      }

      if (!name) {
        // No price found: treat whole line as name with 0 price (user can edit)
        if (line.length > 0) {
          name = line;
          price = 0;
        } else {
          continue;
        }
      }

      const category = this.guessCategory(name);
      categories.add(category);
      items.push({
        name,
        size: null,
        price,
        category,
        description: null,
        image: null,
      });
    }

    if (items.length === 0 && lines.length > 0) {
      for (const line of lines) {
        if (line.length > 0) {
          items.push({
            name: line,
            size: null,
            price: 0,
            category: fallbackCategory,
            description: null,
            image: null,
          });
        }
      }
    }

    return { menu_language: 'en', items };
  }

  private guessCategory(dishName: string): string {
    const lower = dishName.toLowerCase();
    if (/\b(burger|burger\s*|cheese|beef)\b/.test(lower)) return 'Burgers';
    if (/\b(pizza|margherita|pepperoni)\b/.test(lower)) return 'Pizza';
    if (/\b(pasta|spaghetti|noodle|lasagna)\b/.test(lower)) return 'Pasta';
    if (/\b(salad|caesar|green)\b/.test(lower)) return 'Salads';
    if (/\b(soup)\b/.test(lower)) return 'Soups';
    if (/\b(coffee|tea|juice|soda|drink|coke)\b/.test(lower)) return 'Drinks';
    if (/\b(cake|dessert|ice\s*cream|pie)\b/.test(lower)) return 'Desserts';
    if (/\b(fish|salmon|shrimp|seafood)\b/.test(lower)) return 'Seafood';
    if (/\b(chicken|grilled)\b/.test(lower)) return 'Grill';
    return 'Main';
  }

  async extractMenuFromImage(_imageBase64: string): Promise<ExtractedMenuResult> {
    return { menu_language: 'en', items: [] };
  }

  async suggestIngredients(dishName: string): Promise<SuggestIngredientsResult> {
    // Simple mock: return a few generic ingredients so the feature works in tests
    const name = dishName.trim().toLowerCase() || 'dish';
    const ingredients = [
      { name: 'ingredient 1', quantity: '100g' },
      { name: 'ingredient 2', quantity: '50g' },
      { name: 'seasoning', quantity: 'to taste' },
    ];
    return { ingredients };
  }
}
