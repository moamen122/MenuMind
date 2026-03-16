import type { ExtractedMenuItem } from '../ai/providers/ai-provider.interface';

/**
 * Fallback menu items when OpenAI returns empty (e.g. for testing or demo).
 */
export const DEFAULT_MENU_ITEMS: ExtractedMenuItem[] = [
  { name: 'صدور مشوية', size: '1/4 كيلو', price: 192, category: 'مشاوي الدجاج', description: 'صدور دجاج متبلة ومشوية على الفحم', image: null },
  { name: 'صدور مشوية', size: '1/3 كيلو', price: 259, category: 'مشاوي الدجاج', description: 'صدور دجاج متبلة ومشوية على الفحم', image: null },
  { name: 'صدور مشوية', size: '1/2 كيلو', price: 364, category: 'مشاوي الدجاج', description: 'صدور دجاج متبلة ومشوية على الفحم', image: null },
  { name: 'فراخ بانيه', size: '1/4 كيلو', price: 192, category: 'مشاوي الدجاج', description: 'قطع دجاج بانيه مقرمشة', image: null },
  { name: 'شيش طاووق', size: '1/4 كيلو', price: 183, category: 'مشاوي الدجاج', description: 'قطع دجاج متبلة ومشوية على الفحم', image: null },
  { name: 'شيش طاووق', size: '1/3 كيلو', price: 248, category: 'مشاوي الدجاج', description: 'قطع دجاج متبلة ومشوية على الفحم', image: null },
  { name: 'شيش طاووق', size: '1/2 كيلو', price: 353, category: 'مشاوي الدجاج', description: 'قطع دجاج متبلة ومشوية على الفحم', image: null },
  { name: 'كباب ضاني', size: '1/4 كيلو', price: 321, category: 'مشاوي اللحوم', description: 'كباب ضاني مشوي على الفحم', image: null },
  { name: 'كباب ضاني', size: '1/3 كيلو', price: 442, category: 'مشاوي اللحوم', description: 'كباب ضاني مشوي على الفحم', image: null },
  { name: 'كباب ضاني', size: '1/2 كيلو', price: 632, category: 'مشاوي اللحوم', description: 'كباب ضاني مشوي على الفحم', image: null },
  { name: 'كباب بتلو', size: '1/4 كيلو', price: 334, category: 'مشاوي اللحوم', description: 'كباب بتلو متبل ومشوي', image: null },
  { name: 'ريش ضاني', size: '1/4 كيلو', price: 338, category: 'مشاوي اللحوم', description: 'ريش ضاني مشوية على الفحم', image: null },
  { name: 'ريش بتلو', size: '1/4 كيلو', price: 347, category: 'مشاوي اللحوم', description: 'ريش بتلو مشوية على الفحم', image: null },
  { name: 'مسقعة باللحمة المفرومة', size: null, price: 207, category: 'الطواجن', description: 'طاجن مسقعة باللحم المفروم', image: null },
  { name: 'لحمة بصل', size: null, price: 298, category: 'الطواجن', description: 'لحمة مطبوخة بالبصل', image: null },
  { name: 'بطاطس باللحمة', size: null, price: 298, category: 'الطواجن', description: 'بطاطس مطبوخة مع اللحم', image: null },
  { name: 'بامية باللحمة', size: null, price: 298, category: 'الطواجن', description: 'بامية مطبوخة باللحم', image: null },
  { name: 'ورق عنب', size: null, price: 99, category: 'المقبلات', description: 'ورق عنب محشي بالأرز', image: null },
  { name: 'محشي مشكل', size: null, price: 128, category: 'المقبلات', description: 'تشكيلة محشي خضار', image: null },
  { name: 'بطاطس مقلية', size: null, price: 49, category: 'المقبلات', description: 'بطاطس مقلية مقرمشة', image: null },
];
