import type { ExtractedMenuItem } from '../ai/providers/ai-provider.interface';

/**
 * Size patterns: detect size in item name or size field (any position).
 * Order: more specific first. Arabic كيلو forms first, then standalone نصف/ربع/ثمن and 1/2, 1/4, 1/8.
 */
const SIZE_PATTERNS: { pattern: RegExp; sizeName: string }[] = [
  // With كيلو (keep before standalone so "ربع كيلو" → ربع كيلو not ربع)
  { pattern: /(1\/8|⅛)\s*كيلو/i, sizeName: 'ثمن كيلو' },
  { pattern: /ثمن\s*كيلو/i, sizeName: 'ثمن كيلو' },
  { pattern: /(1\/4|¼)\s*كيلو/i, sizeName: 'ربع كيلو' },
  { pattern: /ربع\s*كيلو/i, sizeName: 'ربع كيلو' },
  { pattern: /(1\/3|⅓)\s*كيلو/i, sizeName: 'ثلث كيلو' },
  { pattern: /(1\/2|½)\s*كيلو/i, sizeName: 'نص كيلو' },
  { pattern: /نص\s*كيلو|نصف\s*كيلو/i, sizeName: 'نص كيلو' },
  { pattern: /1\s*كيلو/i, sizeName: 'كيلو' },
  { pattern: /\bكيلو\b/i, sizeName: 'كيلو' },
  { pattern: /\bكيلوجرام\b/i, sizeName: 'كيلو' },
  // Standalone: نصف ربع ثمن and 1/2 1/4 1/8 (no \b - JS \b doesn't work with Arabic letters)
  { pattern: /(?:^|[\s\-–—,])(1\/8|⅛)(?:[\s\-–—,]|$)/, sizeName: 'ثمن' },
  { pattern: /(?:^|[\s\-–—,])ثمن(?:[\s\-–—,]|$)/, sizeName: 'ثمن' },
  { pattern: /(?:^|[\s\-–—,])(1\/4|¼)(?:[\s\-–—,]|$)/, sizeName: 'ربع' },
  { pattern: /(?:^|[\s\-–—,])ربع(?:[\s\-–—,]|$)/, sizeName: 'ربع' },
  { pattern: /(?:^|[\s\-–—,])(1\/3|⅓)(?:[\s\-–—,]|$)/, sizeName: 'ثلث' },
  { pattern: /(?:^|[\s\-–—,])(1\/2|½)(?:[\s\-–—,]|$)/, sizeName: 'نصف' },
  { pattern: /(?:^|[\s\-–—,])نصف(?:[\s\-–—,]|$)/, sizeName: 'نصف' },
  { pattern: /(?:^|[\s\-–—,])نص(?!ف)(?:[\s\-–—,]|$)/, sizeName: 'نصف' },
  // English / numeric (for mixed or English menus)
  { pattern: /\b(1|one)\s*(kilo|kg|k\.?g\.?)\b/i, sizeName: 'One Kilo' },
  { pattern: /\b(1\/2|half)\s*(kilo|kg|k\.?g\.?)\b/i, sizeName: 'Half Kilo' },
  { pattern: /\b(1\/3)\s*(kilo|kg|k\.?g\.?)\b/i, sizeName: 'Third Kilo' },
  { pattern: /\b(1\/4|quarter)\s*(kilo|kg|k\.?g\.?)\b/i, sizeName: 'Quarter Kilo' },
  { pattern: /\b(1\/8)\s*(kilo|kg|k\.?g\.?)\b/i, sizeName: 'Eighth Kilo' },
  { pattern: /\b(small|صغير)\b/i, sizeName: 'Small' },
  { pattern: /\b(medium|وسط)\b/i, sizeName: 'Medium' },
  { pattern: /\b(large|كبير)\b/i, sizeName: 'Large' },
  { pattern: /\b^s$/i, sizeName: 'Small' },
  { pattern: /\b^m$/i, sizeName: 'Medium' },
  { pattern: /\b^l$/i, sizeName: 'Large' },
];

function normalizeForGroupKey(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Detect size from text (item name or size field). Returns the display size name or null.
 */
function detectSizeName(text: string | null | undefined): string | null {
  const t = (text ?? '').trim();
  if (!t) return null;
  for (const { pattern, sizeName } of SIZE_PATTERNS) {
    if (pattern.test(t)) return sizeName;
  }
  // If the whole text looks like a size (e.g. "1/2 K.G"), use it as-is (cleaned)
  if (/^[\d\/\s.]*(kilo|kg|k\.?g\.?|كيلو)?$/i.test(t) || /^(small|medium|large|s|m|l)$/i.test(t)) {
    return t;
  }
  return null;
}

/**
 * Extract base name by removing detected size part from any position (start, middle, or end).
 */
function extractBaseName(name: string, sizeFromField: string | null | undefined): string {
  const fromField = (sizeFromField ?? '').trim();
  if (fromField) {
    return name.trim();
  }
  let base = name.trim();
  for (const { pattern } of SIZE_PATTERNS) {
    base = base.replace(pattern, ' ').trim();
  }
  base = base.replace(/[\s\-–—,]+$/g, '').trim();
  base = base.replace(/^[\s\-–—,]+/g, '').trim();
  base = base.replace(/\s+/g, ' ').trim();
  return base || name.trim();
}

export interface NormalizedSize {
  name: string;
  price: number;
}

export interface NormalizedMenuItem {
  name: string;
  category: string;
  description?: string | null;
  image?: string | null;
  sizes: NormalizedSize[];
}

/**
 * Group flat extracted items by base name and build a sizes array per item.
 * Size is detected in any position in the name:
 * - Arabic with كيلو: كيلو, نص كيلو, ربع كيلو, ثمن كيلو (and 1 كيلو, 1/2 كيلو, 1/4 كيلو, 1/8 كيلو).
 * - Standalone: نصف, ربع, ثمن and 1/2, 1/4, 1/8 (e.g. "نصف فيليه مشوي", "فيليه مشوي 1/4" → one item "فيليه مشوي" with sizes نصف, ربع).
 * If no size is detected, use "Regular".
 */
export function normalizeExtractedItems(flat: ExtractedMenuItem[]): NormalizedMenuItem[] {
  const groupKeyToItems = new Map<string, ExtractedMenuItem[]>();

  type Entry = { item: ExtractedMenuItem; sizeName: string };
  const groupKeyToEntries = new Map<string, Entry[]>();

  for (const item of flat) {
    const sizeFromField = item.size ?? null;
    const sizeName = sizeFromField
      ? (detectSizeName(sizeFromField) || sizeFromField.trim() || 'Regular')
      : (detectSizeName(item.name) || 'Regular');
    const baseName = extractBaseName(item.name, item.size);
    const key = normalizeForGroupKey(baseName);

    if (!groupKeyToEntries.has(key)) {
      groupKeyToEntries.set(key, []);
    }
    groupKeyToEntries.get(key)!.push({ item, sizeName });
  }

  const result: NormalizedMenuItem[] = [];
  for (const [, entries] of groupKeyToEntries) {
    const first = entries[0].item;
    const baseName = extractBaseName(first.name, first.size);
    const sizes: NormalizedSize[] = entries.map(({ item: i, sizeName: sn }) => ({
      name: sn,
      price: typeof i.price === 'number' ? i.price : Number(i.price) || 0,
    }));
    result.push({
      name: baseName,
      category: first.category?.trim() || 'General',
      description: first.description ?? null,
      image: first.image ?? null,
      sizes,
    });
  }

  return result;
}
