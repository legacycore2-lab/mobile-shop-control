// src/lib/printSign.ts — لافتة جهاز للطباعة: لوجو المحل + بيانات بتتكتب بإيد المستخدم
export type SignSize = 'label' | 'a4'

export interface SignData {
  name:      string          // اسم الجهاز
  spec:      string          // النوع / السعة (مثلاً 4/128 GB)
  condition: string          // الحالة (مثلاً كسر زيرو)
  battery:   number | null   // نسبة البطارية — اختيارية
  price:     number | null   // السعر بالجنيه — اختياري (بيظهر زي «1500 L.E»)
}

interface Layout {
  pageW: string; pageH: string; pageCss: string
  logo:  string                 // مسار اللوجو (للطابعة الحرارية: أبيض وأسود صريح)
  logoSmall: { src: string; css: string }   // لوجو أصغر لما الليبل يبقى مليان بيانات
  logoCss: string
  priceMm: (crowded: boolean) => number
  nameMm: (len: number) => number
  boxMm:  (count: number) => number
  boxCss: string                // border / radius / padding
  gap:    string                // مسافة بين الخانات
  sheetCss: string
}

const LAYOUTS: Record<SignSize, Layout> = {
  // ليبل 38×25 مم — الطابعة الحرارية 203dpi (8 نقط/مم) فاللوجو متظبط 1:1
  label: {
    pageW: '38mm', pageH: '25mm', pageCss: '38mm 25mm',
    logo: 'brand/elshafei-logo-thermal.png',
    logoCss: 'width: 26mm; height: auto; image-rendering: pixelated;',
    logoSmall: { src: 'brand/elshafei-logo-thermal-s.png', css: 'width: 22mm; height: auto; image-rendering: pixelated;' },
    priceMm: crowded => (crowded ? 3.4 : 6.5),
    nameMm: len => (len <= 14 ? 4.4 : len <= 20 ? 3.5 : len <= 28 ? 2.7 : 2.2),
    boxMm:  count => (count >= 3 ? 2.2 : 2.6),
    boxCss: 'border: 0.3mm solid #000; border-radius: 0.8mm; padding: 0.3mm 1.1mm;',
    gap: '1mm',
    sheetCss: 'padding: 0.8mm 1mm 0.6mm; gap: 0.4mm;',
  },
  a4: {
    pageW: '297mm', pageH: '210mm', pageCss: 'A4 landscape',
    logo: 'brand/elshafei-logo.png',
    logoCss: 'height: 84mm; max-width: 100%; object-fit: contain;',
    logoSmall: { src: 'brand/elshafei-logo.png', css: 'height: 60mm; max-width: 100%; object-fit: contain;' },
    priceMm: crowded => (crowded ? 22 : 50),
    nameMm: len => (len <= 14 ? 34 : len <= 20 ? 26 : len <= 28 ? 19 : 14),
    boxMm:  count => (count >= 3 ? 15 : 20),
    boxCss: 'border: 1.2mm solid #000; border-radius: 4mm; padding: 3mm 7mm;',
    gap: '8mm',
    sheetCss: 'padding: 10mm 14mm 12mm;',
  },
}

export const SIGN_PAGE_PX: Record<SignSize, { width: number; height: number }> = {
  label: { width: Math.round(38 * 96 / 25.4), height: Math.round(25 * 96 / 25.4) },
  a4:    { width: 1123, height: 794 },
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function batteryBox(percent: number, fontMm: number): string {
  const pct  = Math.max(0, Math.min(100, Math.round(percent)))
  const fill = Math.round((pct / 100) * 14)
  return `<div class="box ltr"><svg viewBox="0 0 20 10" xmlns="http://www.w3.org/2000/svg" `
    + `style="width:${(fontMm * 1.5).toFixed(1)}mm;height:${(fontMm * 0.75).toFixed(1)}mm">`
    + `<rect x="0.5" y="0.5" width="16" height="9" rx="1.5" fill="none" stroke="#000" stroke-width="1"/>`
    + `<rect x="17" y="3" width="2.5" height="4" fill="#000"/>`
    + `<rect x="2" y="2" width="${fill}" height="6" fill="#000"/></svg>${pct}%</div>`
}

export function buildSignHtml(data: SignData, size: SignSize, baseUrl: string, autoPrint: boolean): string {
  const L = LAYOUTS[size]
  const name = data.name.trim()
  const spec = data.spec.trim()
  const cond = data.condition.trim()
  const count = [spec, cond, data.battery != null ? 'b' : ''].filter(Boolean).length
  const hasPrice = data.price != null
  // لو فيه اسم وخانات وسعر مع بعض، اللوجو بيصغر شوية عشان الكل يتساع
  const crowded = hasPrice && name !== '' && count > 0
  const logo = crowded ? L.logoSmall : { src: L.logo, css: L.logoCss }
  const boxFontMm = L.boxMm(count)
  const priceHtml = hasPrice ? `<div class="price">${data.price} L.E</div>` : ''
  const boxes = [
    spec ? `<div class="box ltr">${escapeHtml(spec)}</div>` : '',
    cond ? `<div class="box">${escapeHtml(cond)}</div>` : '',
    data.battery != null ? batteryBox(data.battery, boxFontMm) : '',
  ].join('')

  return `<!DOCTYPE html><html dir="rtl"><head>
  <meta charset="UTF-8">
  <title>لافتة جهاز</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    @page { size: ${L.pageCss}; margin: 0; }
    html, body { width: ${L.pageW}; height: ${L.pageH}; background: #fff; font-family: Tahoma, Arial, sans-serif; }
    .sheet { width: ${L.pageW}; height: ${L.pageH}; display: flex; flex-direction: column; align-items: center;
             justify-content: space-between; overflow: hidden; ${L.sheetCss} }
    .logo { display: block; ${logo.css} }
    .price { font: 800 ${L.priceMm(crowded)}mm/1.1 Arial, sans-serif; direction: ltr; text-align: center; white-space: nowrap; }
    .name { font: italic 800 ${L.nameMm(name.length)}mm/1.1 Arial, sans-serif; direction: ltr; text-align: center;
            max-width: 100%; white-space: nowrap; overflow: hidden; }
    .row { display: flex; gap: ${L.gap}; width: 100%; justify-content: center; align-items: stretch; }
    .box { ${L.boxCss} font: 800 ${boxFontMm}mm/1.15 Arial, Tahoma, sans-serif; text-align: center;
           display: flex; align-items: center; gap: ${(boxFontMm * 0.25).toFixed(2)}mm; white-space: nowrap; }
    .box.ltr { direction: ltr; }
  </style>
  </head><body>
  <div class="sheet">
    <img class="logo" src="${escapeHtml(baseUrl + logo.src)}" alt="">
    ${name ? `<div class="name">${escapeHtml(name)}</div>` : ''}
    ${priceHtml}
    ${boxes ? `<div class="row">${boxes}</div>` : ''}
  </div>
  ${autoPrint ? '<script>window.onload=function(){window.print()};<\/script>' : ''}
  </body></html>`
}

export function signBaseUrl(): string {
  return `${window.location.origin}${import.meta.env.BASE_URL}`
}

export function printSign(data: SignData, size: SignSize): void {
  const win = window.open('', '_blank')
  if (win) { win.document.write(buildSignHtml(data, size, signBaseUrl(), true)); win.document.close() }
}
