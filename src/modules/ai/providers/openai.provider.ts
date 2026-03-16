import {
  Injectable,
  HttpException,
  HttpStatus,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import type {
  IAiProvider,
  ExtractedMenuResult,
  SuggestIngredientsResult,
} from './ai-provider.interface';

function wrapOpenAIError(err: unknown): never {
  if (err && typeof err === 'object' && 'status' in err) {
    const status = (err as { status?: number }).status;
    if (status === 429) {
      throw new ServiceUnavailableException(
        'AI quota exceeded. Please check your API plan and billing, or try again later.',
      );
    }
    if (status === 401) {
      throw new HttpException(
        'Invalid or missing AI API key.',
        HttpStatus.BAD_GATEWAY,
      );
    }
  }
  const message =
    err instanceof Error ? err.message : 'AI service temporarily unavailable';
  throw new ServiceUnavailableException(message);
}

@Injectable()
export class OpenAiProvider implements IAiProvider {
  private readonly client: OpenAI | null = null;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('OPENAI_API_KEY');
    if (apiKey) {
      this.client = new OpenAI({ apiKey });
    }
  }

  private ensureClient(): OpenAI {
    if (!this.client) {
      throw new Error(
        'OPENAI_API_KEY is not set. Configure it in your environment.',
      );
    }
    return this.client;
  }

  async extractMenu(menuText: string): Promise<ExtractedMenuResult> {
    const client = this.ensureClient();
    const systemPrompt = `You are a menu extraction assistant. Given raw menu text, extract each dish as a structured item.

Rules:
1. Detect the primary language of the menu (Arabic or English) and return it in the field "menu_language" as "ar" or "en".
2. PRESERVE THE ORIGINAL LANGUAGE: Do not translate. If the menu is in Arabic, output "name" and "category" in Arabic exactly as written. If in English, output in English. Copy the exact text from the menu—never convert or translate.
3. Return ONLY valid JSON, no markdown or extra text.

Output format (clean JSON only):
{
  "menu_language": "ar" | "en",
  "items": [
    {
      "name": "string",
      "size": "string | null",
      "price": number,
      "category": "string",
      "description": "string | null",
      "image": null
    }
  ]
}
- name: exact text from menu in its original language (e.g. Arabic stays Arabic). size: portion/size if present (e.g. "1/2 kg") or null. price: number only (EGP). category: section name in original language. description: optional, or null. image: always null.`;

    try {
      const response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `Extract each menu item. Output every "name" and "category" in the EXACT SAME LANGUAGE as the text below (if the menu is in Arabic, write Arabic; do not translate to English).\n\n${menuText}`,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from AI provider');
      }

      const parsed = this.parseExtractedMenuResult(content);
      return parsed;
    } catch (err) {
      wrapOpenAIError(err);
    }
  }

  async extractMenuFromImage(imageBase64: string): Promise<ExtractedMenuResult> {
    const client = this.ensureClient();
    const imageUrl =
      imageBase64.startsWith('data:') ? imageBase64 : `data:image/png;base64,${imageBase64}`;

    const systemPrompt = `You are a menu extraction assistant. Your task is to extract EVERY menu item from the image with no omissions.

CRITICAL – Completeness:
- Extract every single dish/item from every section of the menu. Do not summarize or sample.
- Typical full restaurant menus have 40–80+ items. Your output must include every item you see.
- Cover all sections (e.g. meat grills, chicken grills, tagines/casseroles, appetizers, specialties). Do not stop after one or two sections.

Rules:
1. Detect the primary language of the menu (Arabic or English) and return it in "menu_language" as "ar" or "en".
2. PRESERVE THE ORIGINAL LANGUAGE—NEVER translate. If the menu is in Arabic, every "name", "category", and "size" MUST be in Arabic (e.g. صدور مشوية, مشاوي الدجاج, 1/4 كيلو). If in English, output in English. Copy the exact script and wording from the image; never convert or translate.
3. Use the section/heading as the category for each item, in the same language as the menu (e.g. مشاوي اللحوم, مشاوي الدجاج, الطواجن, المقبلات for Arabic).
4. Extract price as a number only (EGP; no symbol). Ignore VAT or tax notes for the price value.
5. Ignore addresses, phone numbers, QR codes, logos, and non-menu text.
6. Sizes and multiple prices:
   - If the menu has columns like 1/2 K.G, 1/3 K.G, 1/4 K.G: create one item per size with the same name, size set to that column (e.g. "1/2 K.G", "1/4 K.G") and the corresponding price.
   - If an item has a single price with no size, set size to null.
   - Items with one price per row (e.g. half chicken, quarter chicken) get one item each; use the portion as size if shown (e.g. "نصف فرخة") or null.
7. Return ONLY valid JSON, no explanation or markdown. Include every item from every section.

Output format (clean JSON only):
{
  "menu_language": "ar" | "en",
  "items": [
    {
      "name": "string",
      "size": "string | null",
      "price": number,
      "category": "string",
      "description": "string | null",
      "image": null
    }
  ]
}`;

    try {
      const response = await client.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extract every menu item from this image. CRITICAL: Output all "name", "category", and "size" fields in the EXACT SAME LANGUAGE as the menu. If the menu is in Arabic, write Arabic in your JSON (e.g. name: "صدور مشوية", category: "مشاوي الدجاج"). Do NOT translate to English. If the menu is in English, output English. List each dish from every section. For items with multiple size columns, create a separate item per size with its price. Do not omit any items.',
              },
              {
                type: 'image_url',
                image_url: { url: imageUrl },
              },
            ],
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
        max_tokens: 16384,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from AI provider');
      }

      const parsed = this.parseExtractedMenuResult(content);
      return parsed;
    } catch (err) {
      wrapOpenAIError(err);
    }
  }

  private parseExtractedMenuResult(content: string): ExtractedMenuResult {
    const parsed = JSON.parse(content) as ExtractedMenuResult;
    if (!parsed.items || !Array.isArray(parsed.items)) {
      throw new Error('Invalid AI response: missing or invalid items array');
    }
    const menu_language =
      parsed.menu_language === 'ar' || parsed.menu_language === 'en'
        ? parsed.menu_language
        : undefined;
    const items = parsed.items.map((it) => ({
      name: String(it?.name ?? '').trim() || 'Item',
      size: it?.size != null ? String(it.size) : null,
      price: typeof it?.price === 'number' ? it.price : Number(it?.price) || 0,
      category: String(it?.category ?? '').trim() || 'General',
      description: it?.description != null ? String(it.description) : null,
      image: it?.image ?? null,
    }));
    return { menu_language, items };
  }

  async suggestIngredients(dishName: string): Promise<SuggestIngredientsResult> {
    const client = this.ensureClient();
    const systemPrompt = `You are a kitchen assistant. For a given dish name, suggest a list of typical ingredients with quantities.
Rules:
- Return ONLY valid JSON, no markdown or extra text.
- Each ingredient: name (lowercase, string), quantity (string, e.g. "150g", "1", "2 tbsp").
- Output format: { "ingredients": [ { "name": "...", "quantity": "..." }, ... ] }
- Include 5-15 typical ingredients for the dish.`;

    try {
      const response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: dishName },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from AI provider');
      }

      const parsed = JSON.parse(content) as SuggestIngredientsResult;
      if (!parsed.ingredients || !Array.isArray(parsed.ingredients)) {
        throw new Error(
          'Invalid AI response: missing or invalid ingredients array',
        );
      }
      return parsed;
    } catch (err) {
      wrapOpenAIError(err);
    }
  }
}
