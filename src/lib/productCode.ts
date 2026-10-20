// src/lib/productCode.ts
// كود تلقائي للمنتج اللي مالوش SKU ولا باركود — عشان يتطبع له QR ويتمسح في الكاشير
export function generateProductCode(): string {
  const time = Date.now().toString(36).toUpperCase()
  const rand = Math.random().toString(36).slice(2, 5).toUpperCase()
  return `PRD-${time}${rand}`
}
