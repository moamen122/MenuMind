import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface CostEstimateIngredient {
  name: string;
  /** Recipe quantity only (e.g. "30 ml", "250 g"). User can edit or add their own. */
  quantity_needed: string;
  /** "liquid" = store price_per_liter; "solid" = store price_per_kg */
  unit_type: 'liquid' | 'solid';
  /** EGP per 1 liter (when unit_type is liquid). Required for pricing logic. */
  price_per_liter?: number;
  /** EGP per 1 kg (when unit_type is solid). Required for pricing logic. */
  price_per_kg?: number;
  notes?: string;
}

export interface CostEstimateResponse {
  dish_name: string;
  description: string;
  as_of_date: string;
  currency: string;
  data_source: string;
  ingredients: CostEstimateIngredient[];
}

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

type RawIngredient = CostEstimateIngredient & {
  price?: number;
  unit?: string;
};

function normalizeIngredient(i: RawIngredient): CostEstimateIngredient {
  const name = String(i.name ?? '');
  const quantity_needed = String(i.quantity_needed ?? '');
  const notes = i.notes != null ? String(i.notes) : undefined;

  if (i.unit_type === 'liquid' || i.unit_type === 'solid') {
    const pricePerLiter = i.unit_type === 'liquid' && (i.price_per_liter != null)
      ? (typeof i.price_per_liter === 'number' ? i.price_per_liter : Number(i.price_per_liter) || 0)
      : undefined;
    const pricePerKg = i.unit_type === 'solid' && (i.price_per_kg != null)
      ? (typeof i.price_per_kg === 'number' ? i.price_per_kg : Number(i.price_per_kg) || 0)
      : undefined;
    return {
      name,
      quantity_needed,
      unit_type: i.unit_type,
      price_per_liter: pricePerLiter,
      price_per_kg: pricePerKg,
      notes,
    };
  }

  const price = typeof i.price === 'number' ? i.price : Number(i.price) || 0;
  const unit = String(i.unit ?? '').toLowerCase();
  const isLiquid = /\b(ml|l|liter|litre)\b/.test(unit) || /^\d+\s*ml$/i.test(quantity_needed);
  if (isLiquid && price > 0) {
    const mlMatch = unit.match(/(\d+(?:\.\d+)?)\s*ml/) || quantity_needed.match(/(\d+(?:[.,]\d+)?)\s*ml/i);
    const ml = mlMatch ? parseFloat(mlMatch[1].replace(',', '.')) : 30;
    const pricePerLiter = ml > 0 ? (price * 1000) / ml : 0;
    return { name, quantity_needed, unit_type: 'liquid', price_per_liter: pricePerLiter, notes };
  }
  const isSolid = /\b(kg|g|gm|gram|kilo)\b/.test(unit) || /^\d+\s*(g|kg)\b/i.test(quantity_needed);
  if (isSolid && price > 0) {
    const gMatch = unit.match(/(\d+(?:\.\d+)?)\s*(?:g|gram)/) || quantity_needed.match(/(\d+(?:[.,]\d+)?)\s*(g|kg)/i);
    let grams = 1000;
    if (gMatch) {
      const n = parseFloat(gMatch[1].replace(',', '.'));
      grams = (gMatch[2] || 'g').toLowerCase() === 'kg' ? n * 1000 : n;
    }
    const pricePerKg = grams > 0 ? (price * 1000) / grams : 0;
    return { name, quantity_needed, unit_type: 'solid', price_per_kg: pricePerKg, notes };
  }
  return { name, quantity_needed, unit_type: 'solid', price_per_kg: price, notes };
}

@Injectable()
export class DeepSeekCostEstimateService {
  constructor(private readonly config: ConfigService) {}

  async getCostEstimate(dishName: string, language?: 'ar' | 'en', size?: string): Promise<CostEstimateResponse> {
    const apiKey = this.config.get<string>('DEEPSEEK_API_KEY');
    if (!apiKey?.trim()) {
      throw new ServiceUnavailableException(
        'DEEPSEEK_API_KEY is not set. Configure it in your environment.',
      );
    }

    const today = new Date().toISOString().slice(0, 10);
    const systemPrompt = `You are a food cost analyst for the Egyptian (EGP) market. You must work in TWO steps for every request.

STEP 1 – UNDERSTAND THE RECIPE FIRST:
- Using ONLY the exact dish or beverage name (the title), first determine what the item IS and what RECIPE it follows. Think like a chef or recipe source: what are the actual ingredients that go into this specific item, and in what proportions?
- Examples: "Pink lemonade" = a lemonade with a pink color, typically made from lemon juice, sugar, water, and something for the pink color (e.g. cranberry juice, grenadine, strawberry syrup, or a small amount of cherry/raspberry). "Espresso" = espresso shot from coffee and water. "Feteer Meshaltet" = layered pastry: flour, ghee/samna or butter, water, salt (no meat). "Orange juice" = oranges, optionally sugar. Do NOT add ingredients that are not part of the standard recipe for that exact title (e.g. no minced beef in Feteer; no electricity or labor).
- Once you have the recipe (list of ingredients and approximate quantities for the requested portion size), proceed to Step 2.

STEP 2 – ASSIGN COSTS TO EACH INGREDIENT:
- For each ingredient from the recipe, look up or estimate the CURRENT market price in Egypt (EGP). Store prices in standard units ONLY: price_per_liter for liquids, price_per_kg for solids. Never use "per 30 ml" or similar; only per 1 L or per 1 kg.
- Use only current, up-to-date pricing. Set "as_of_date" to today's date in YYYY-MM-DD.

OUTPUT:
- Return ONLY valid JSON, no markdown or explanation. Use this exact structure:
{
  "dish_name": "<dish/beverage name>",
  "description": "<short description of the dish or drink – what it is and how it's made>",
  "as_of_date": "<today YYYY-MM-DD>",
  "currency": "EGP",
  "data_source": "<brief source of price data>",
  "ingredients": [
    {
      "name": "<ingredient name>",
      "quantity_needed": "<recipe quantity for the requested portion, e.g. 45 ml, 20 g>",
      "unit_type": "liquid | solid",
      "price_per_liter": <number, EGP per 1 liter – ONLY when unit_type is liquid>,
      "price_per_kg": <number, EGP per 1 kg – ONLY when unit_type is solid>,
      "notes": "<optional>"
    }
  ]
}
- Include 5–15 ingredients that are actually in the recipe. No overhead (electricity, labor, rent, etc.).
- PORTION SIZE: The user sends a portion size (e.g. "22oz", "16oz", "Regular"). "quantity_needed" must be for that EXACT portion. Different sizes = different quantities (e.g. 22oz drink has more of each ingredient than 16oz).
- LANGUAGE: Return "description" and each ingredient's "name" and "quantity_needed" in the user's language (Arabic or English) as requested. Do not mix languages.`;

    const langInstruction = (language === 'ar')
      ? 'Use Arabic for description and for every ingredient name and quantity_needed.'
      : 'Use English for description and for every ingredient name and quantity_needed.';

    const effectiveSize = (size?.trim() || 'Regular').replace(/^regular$/i, 'Regular');
    const sizeInstruction = effectiveSize === 'Regular'
      ? 'Portion: one standard serving (one person / one typical plate or glass).'
      : `Portion: exactly "${effectiveSize}". Scale all ingredient quantities to this size (e.g. 22oz has more of each ingredient than 16oz).`;

    const userMessage = `Today is ${today}. Item: "${dishName}". Portion: ${sizeInstruction} Language: ${langInstruction}

First determine the RECIPE for "${dishName}" (what ingredients and how much for this portion). Then assign current EGP market price per liter or per kg to each ingredient. Return only the JSON object.`;

    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new ServiceUnavailableException(
        `DeepSeek API error: ${response.status} ${errText}`,
      );
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new ServiceUnavailableException('Empty response from DeepSeek');
    }

    try {
      const parsed = JSON.parse(content) as CostEstimateResponse;
      if (!parsed.ingredients || !Array.isArray(parsed.ingredients)) {
        throw new Error('Invalid response: missing ingredients array');
      }
      const asOfDate = String(parsed.as_of_date ?? today).slice(0, 10);
      return {
        dish_name: String(parsed.dish_name ?? dishName),
        description: String(parsed.description ?? ''),
        as_of_date: asOfDate || today,
        currency: String(parsed.currency ?? 'EGP'),
        data_source: String(parsed.data_source ?? ''),
        ingredients: parsed.ingredients.map((i) => normalizeIngredient(i)),
      };
    } catch (err) {
      throw new ServiceUnavailableException(
        err instanceof Error ? err.message : 'Failed to parse DeepSeek response',
      );
    }
  }
}
