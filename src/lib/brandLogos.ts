// src/lib/brandLogos.ts
// ربط اسم الماركة (بأي كتابة شائعة) بملف الشعار في public/brands

const LOGO_ALIASES: Record<string, string[]> = {
  apple:    ['apple', 'iphone', 'ايفون', 'آيفون', 'ابل', 'أبل'],
  samsung:  ['samsung', 'سامسونج', 'سامسونغ'],
  oppo:     ['oppo', 'اوبو', 'أوبو'],
  vivo:     ['vivo', 'فيفو'],
  nokia:    ['nokia', 'نوكيا'],
  zte:      ['zte'],
  motorola: ['motorola', 'موتورولا'],
  realme:   ['realme', 'ريلمي'],
  xiaomi:   ['xiaomi', 'mi', 'شاومي', 'شياومي'],
  poco:     ['poco', 'بوكو'],
  huawei:   ['huawei', 'هواوي'],
  redmi:    ['redmi', 'ريدمي'],
}

export function getBrandLogo(brand: string): string | null {
  const key = brand.trim().toLowerCase()
  for (const [file, names] of Object.entries(LOGO_ALIASES)) {
    if (names.includes(key)) return `${import.meta.env.BASE_URL}brands/${file}.png`
  }
  return null
}
