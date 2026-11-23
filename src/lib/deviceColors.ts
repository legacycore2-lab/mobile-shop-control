// src/lib/deviceColors.ts
// كتالوج ألوان الموبايلات + ألوان الأيفونات الرسمية لكل موديل

export interface ColorOption {
  /** القيمة اللي بتتسجل في خانة اللون */
  value: string
  /** الاسم التاني (عربي/إنجليزي) للعرض والبحث */
  alias: string
  /** كلمات بحث إضافية (نطق الاسم الإنجليزي بالعربي زي ما بيتقال في المحلات) */
  keywords?: string
}

const WORDS: Record<string, string> = {
  black: 'بلاك', white: 'وايت', blue: 'بلو', green: 'جرين', red: 'ريد', yellow: 'يلو',
  pink: 'بينك', purple: 'بيربل', silver: 'سيلفر', gold: 'جولد', gray: 'جراي', grey: 'جراي',
  space: 'سبيس', graphite: 'جرافيت', midnight: 'ميدنايت', starlight: 'ستارلايت',
  natural: 'ناتشورال', desert: 'ديزرت', titanium: 'تيتانيوم', rose: 'روز', pacific: 'باسيفيك',
  sierra: 'سييرا', alpine: 'الباين', deep: 'ديب', jet: 'جيت', coral: 'كورال', teal: 'تيل',
  ultramarine: 'الترامارين', mist: 'ميست', sage: 'ساج', lavender: 'لافندر', cosmic: 'كوزميك',
  orange: 'اورانج', cloud: 'كلاود', light: 'لايت', sky: 'سكاي',
}

function transliterate(en: string): string {
  return en.toLowerCase().split(' ').map(w => WORDS[w] ?? '').filter(Boolean).join(' ')
}

const c = (value: string, alias: string): ColorOption => ({ value, alias, keywords: transliterate(alias) })
/** ألوان الأيفون: القيمة بالعربي والاسم الإنجليزي للبحث والعرض */
const ip = (en: string, ar: string): ColorOption => ({ value: ar, alias: en, keywords: transliterate(en) })

// ── ألوان الأيفونات الرسمية (القيمة بالعربي، والاسم الإنجليزي للبحث) ──────────────

const BLACK_C      = ip('Black', 'أسود')
const WHITE_C      = ip('White', 'أبيض')
const BLUE_C       = ip('Blue', 'أزرق')
const GREEN_C      = ip('Green', 'أخضر')
const RED_C        = ip('Red', 'أحمر')
const YELLOW_C     = ip('Yellow', 'أصفر')
const PINK_C       = ip('Pink', 'وردي')
const PURPLE_C     = ip('Purple', 'بنفسجي')
const SPACE_GRAY   = ip('Space Gray', 'رمادي فلكي')
const SILVER       = ip('Silver', 'فضي')
const GOLD         = ip('Gold', 'ذهبي')
const GRAPHITE     = ip('Graphite', 'جرافيت')
const MIDNIGHT     = ip('Midnight', 'أسود ميدنايت')
const STARLIGHT    = ip('Starlight', 'ستارلايت')
const BLACK_TI     = ip('Black Titanium', 'تيتانيوم أسود')
const WHITE_TI     = ip('White Titanium', 'تيتانيوم أبيض')
const NATURAL_TI   = ip('Natural Titanium', 'تيتانيوم طبيعي')
const BLUE_TI      = ip('Blue Titanium', 'تيتانيوم أزرق')
const DESERT_TI    = ip('Desert Titanium', 'تيتانيوم صحراوي')
const SPACE_BLACK  = ip('Space Black', 'أسود فلكي')

const IPHONE_COLORS: Record<string, ColorOption[]> = {
  '5s':      [SPACE_GRAY, SILVER, GOLD],
  '6':       [SPACE_GRAY, SILVER, GOLD],
  '6plus':   [SPACE_GRAY, SILVER, GOLD],
  '6s':      [SPACE_GRAY, SILVER, GOLD, ip('Rose Gold', 'روز جولد')],
  '6splus':  [SPACE_GRAY, SILVER, GOLD, ip('Rose Gold', 'روز جولد')],
  x:         [SPACE_GRAY, SILVER],
  xs:        [SPACE_GRAY, SILVER, GOLD],
  xsmax:     [SPACE_GRAY, SILVER, GOLD],
  xr:        [BLACK_C, WHITE_C, BLUE_C, YELLOW_C, ip('Coral', 'مرجاني'), RED_C],
  '7':       [BLACK_C, ip('Jet Black', 'أسود لامع'), SILVER, GOLD, ip('Rose Gold', 'روز جولد'), RED_C],
  '7plus':   [BLACK_C, ip('Jet Black', 'أسود لامع'), SILVER, GOLD, ip('Rose Gold', 'روز جولد'), RED_C],
  '8':       [SPACE_GRAY, SILVER, GOLD, RED_C],
  '8plus':   [SPACE_GRAY, SILVER, GOLD, RED_C],
  se:        [BLACK_C, WHITE_C, RED_C, MIDNIGHT, STARLIGHT],
  '11':      [BLACK_C, WHITE_C, GREEN_C, YELLOW_C, PURPLE_C, RED_C],
  '11pro':   [SPACE_GRAY, SILVER, GOLD, ip('Midnight Green', 'أخضر ميدنايت')],
  '11promax':[SPACE_GRAY, SILVER, GOLD, ip('Midnight Green', 'أخضر ميدنايت')],
  '12':      [BLACK_C, WHITE_C, RED_C, GREEN_C, BLUE_C, PURPLE_C],
  '12mini':  [BLACK_C, WHITE_C, RED_C, GREEN_C, BLUE_C, PURPLE_C],
  '12pro':   [GRAPHITE, SILVER, GOLD, ip('Pacific Blue', 'أزرق باسفيك')],
  '12promax':[GRAPHITE, SILVER, GOLD, ip('Pacific Blue', 'أزرق باسفيك')],
  '13':      [MIDNIGHT, STARLIGHT, BLUE_C, PINK_C, RED_C, GREEN_C],
  '13mini':  [MIDNIGHT, STARLIGHT, BLUE_C, PINK_C, RED_C, GREEN_C],
  '13pro':   [GRAPHITE, GOLD, SILVER, ip('Sierra Blue', 'أزرق سييرا'), ip('Alpine Green', 'أخضر ألباين')],
  '13promax':[GRAPHITE, GOLD, SILVER, ip('Sierra Blue', 'أزرق سييرا'), ip('Alpine Green', 'أخضر ألباين')],
  '14':      [MIDNIGHT, STARLIGHT, BLUE_C, PURPLE_C, RED_C, YELLOW_C],
  '14plus':  [MIDNIGHT, STARLIGHT, BLUE_C, PURPLE_C, RED_C, YELLOW_C],
  '14pro':   [SPACE_BLACK, SILVER, GOLD, ip('Deep Purple', 'بنفسجي غامق')],
  '14promax':[SPACE_BLACK, SILVER, GOLD, ip('Deep Purple', 'بنفسجي غامق')],
  '15':      [BLACK_C, BLUE_C, GREEN_C, YELLOW_C, PINK_C],
  '15plus':  [BLACK_C, BLUE_C, GREEN_C, YELLOW_C, PINK_C],
  '15pro':   [BLACK_TI, WHITE_TI, BLUE_TI, NATURAL_TI],
  '15promax':[BLACK_TI, WHITE_TI, BLUE_TI, NATURAL_TI],
  '16':      [BLACK_C, WHITE_C, PINK_C, ip('Teal', 'أخضر مزرق'), ip('Ultramarine', 'أزرق ألترامارين')],
  '16plus':  [BLACK_C, WHITE_C, PINK_C, ip('Teal', 'أخضر مزرق'), ip('Ultramarine', 'أزرق ألترامارين')],
  '16e':     [BLACK_C, WHITE_C],
  '16pro':   [BLACK_TI, WHITE_TI, NATURAL_TI, DESERT_TI],
  '16promax':[BLACK_TI, WHITE_TI, NATURAL_TI, DESERT_TI],
  '17':      [BLACK_C, WHITE_C, ip('Mist Blue', 'أزرق ضبابي'), ip('Sage', 'أخضر ساج'), ip('Lavender', 'لافندر')],
  '17pro':   [SILVER, ip('Cosmic Orange', 'برتقالي كوزميك'), ip('Deep Blue', 'أزرق غامق')],
  '17promax':[SILVER, ip('Cosmic Orange', 'برتقالي كوزميك'), ip('Deep Blue', 'أزرق غامق')],
  air:       [SPACE_BLACK, ip('Cloud White', 'أبيض سحابي'), ip('Light Gold', 'ذهبي فاتح'), ip('Sky Blue', 'أزرق سماوي')],
}

// ── ألوان عامة لباقي الماركات (بالعربي) ───────────────────────────────────────

export const GENERIC_COLORS: ColorOption[] = [
  c('أسود', 'Black'), c('أبيض', 'White'), c('أزرق', 'Blue'), c('أخضر', 'Green'),
  c('أحمر', 'Red'), c('أصفر', 'Yellow'), c('وردي', 'Pink'), c('بنفسجي', 'Purple'),
  c('ذهبي', 'Gold'), c('فضي', 'Silver'), c('رمادي', 'Gray'), c('برتقالي', 'Orange'),
  c('بني', 'Brown'), c('بيج', 'Beige'), c('كحلي', 'Navy'), c('سماوي', 'Cyan'),
  c('تركواز', 'Turquoise'), c('لافندر', 'Lavender'), c('كريمي', 'Cream'),
  c('عنابي', 'Burgundy'), c('نعناعي', 'Mint'), c('جرافيت', 'Graphite'),
  c('تيتانيوم', 'Titanium'), c('روز جولد', 'Rose Gold'), c('متعدد الألوان', 'Multicolor'),
  // درجات وتنويعات شائعة في السوق
  c('أسود لامع', 'Jet Black'), c('أسود ميتاليك', 'Metallic Black'), c('أسود فانتوم', 'Phantom Black'),
  c('أبيض فانتوم', 'Phantom White'), c('أبيض لؤلؤي', 'Pearl White'), c('أبيض ثلجي', 'Snow White'),
  c('أزرق ملكي', 'Royal Blue'), c('أزرق سماوي', 'Sky Blue'), c('أزرق فاتح', 'Light Blue'),
  c('أزرق غامق', 'Dark Blue'), c('أزرق ليلي', 'Midnight Blue'), c('أزرق جليدي', 'Ice Blue'),
  c('أخضر زيتي', 'Olive Green'), c('أخضر غامق', 'Dark Green'), c('أخضر فاتح', 'Light Green'),
  c('أخضر ميدنايت', 'Midnight Green'), c('أحمر غامق', 'Dark Red'), c('أحمر ناري', 'Product Red'),
  c('رمادي غامق', 'Dark Gray'), c('رمادي فاتح', 'Light Gray'), c('رمادي فلكي', 'Space Gray'),
  c('فضي ميتاليك', 'Metallic Silver'), c('ذهبي فاتح', 'Light Gold'), c('ذهبي وردي', 'Pink Gold'),
  c('بنفسجي فاتح', 'Light Purple'), c('بنفسجي غامق', 'Deep Purple'), c('ليلكي', 'Lilac'),
  c('وردي فاتح', 'Light Pink'), c('كاكي', 'Khaki'), c('فيروزي', 'Aqua'), c('مرجاني', 'Coral'),
  c('ستارلايت', 'Starlight'), c('ميدنايت', 'Midnight'), c('تيتانيوم رمادي', 'Titanium Gray'),
  c('تيتانيوم أسود', 'Titanium Black'), c('تيتانيوم بنفسجي', 'Titanium Violet'),
  c('تيتانيوم أصفر', 'Titanium Yellow'), c('تيتانيوم أخضر', 'Titanium Green'),
  c('تيتانيوم أزرق', 'Titanium Blue'), c('تيتانيوم طبيعي', 'Natural Titanium'),
  c('تيتانيوم صحراوي', 'Desert Titanium'), c('برتقالي كوزميك', 'Cosmic Orange'),
  c('متدرج', 'Gradient'),
]

// ── التعرف على موديل الأيفون ──────────────────────────────────────────────────

const ARABIC_TOKENS: [RegExp, string][] = [
  [/برو/g, 'pro'], [/ماكس/g, 'max'], [/بلس/g, 'plus'], [/ميني/g, 'mini'],
  [/ايفون|آيفون|إيفون/g, 'iphone'],
]

/** "iPhone 15 Pro Max 256GB" → "15promax" */
function iphoneKey(modelName: string): string {
  let s = modelName.toLowerCase()
  for (const [re, rep] of ARABIC_TOKENS) s = s.replace(re, rep)
  return s
    .replace(/\d+\s*(gb|tb)/g, '')
    .replace(/apple|iphone/g, '')
    .replace(/[^a-z0-9]/g, '')
}

export function isIphone(brandName: string, modelName: string): boolean {
  const text = `${brandName} ${modelName}`.toLowerCase()
  return /iphone|ايفون|آيفون|إيفون|apple|ابل|أبل/.test(text)
}

/** الألوان الرسمية للموديل لو أيفون ومعروف، غير كده null */
export function officialColors(brandName: string, modelName: string): ColorOption[] | null {
  if (!isIphone(brandName, modelName)) return null
  return IPHONE_COLORS[iphoneKey(modelName)] ?? null
}
