// src/lib/printBarcodeLabel.ts
// ── محرك طباعة ليبل QR + اسم الصنف — 38mm × 25mm (مشترك بين كل الصفحات) ──────

import QRCode from 'qrcode'

export interface BarcodeLabel {
  type:          'product' | 'device'
  code:          string
  name:          string
  subName?:      string
  price?:        number
  cost_price?:   number
  extra?:        string
  imei1?:        string
  imei2?:        string
  storage?:      string
  color?:        string
  condition?:    string
  battery?:      number | null   // نسبة البطارية — بتظهر تحت الاسم على الليبل
  warranty?:     string
  supplier?:     string
  invoice?:      string
  sku?:          string
  category?:     string
  quantity?:     number
  unit?:         string
}

// اسم الصنف + السعة واللون
export function labelCaption(label: BarcodeLabel): string {
  return [label.name, label.subName].filter(Boolean).join(' · ')
}

// رسمة بطارية صغيرة بتتملي على قد النسبة (أرقام بس — آمنة تتحط في HTML)
export function batteryHtml(percent: number): string {
  const pct  = Math.max(0, Math.min(100, Math.round(percent)))
  const fill = Math.round((pct / 100) * 14)
  const svg = `<svg class="bat-icon" width="16" height="8" viewBox="0 0 20 10" xmlns="http://www.w3.org/2000/svg">`
    + `<rect x="0.5" y="0.5" width="16" height="9" rx="1.5" fill="none" stroke="#000" stroke-width="1"/>`
    + `<rect x="17" y="3" width="2.5" height="4" fill="#000"/>`
    + `<rect x="2" y="2" width="${fill}" height="6" fill="#000"/></svg>`
  return `<span class="bat">${svg}${pct}%</span>`
}

// ── إعدادات مقاس الليبل واتجاه الطباعة (بتتحفظ على الجهاز) ────────────────────
export interface LabelPrintSettings {
  width:    number            // عرض الورقة اللي الدرايفر شايفها (mm)
  height:   number            // طول الورقة (mm)
  rotation: 0 | 90 | 180 | 270 // تدوير المحتوى لو الطابعة بتطبعه مقلوب
}

export const DEFAULT_LABEL_SETTINGS: LabelPrintSettings = { width: 38, height: 24.5, rotation: 0 }
const SETTINGS_KEY = 'label-print-settings'

export function loadLabelSettings(): LabelPrintSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return DEFAULT_LABEL_SETTINGS
    const p = JSON.parse(raw) as Partial<LabelPrintSettings>
    const w = Number(p.width), h = Number(p.height)
    const r = [0, 90, 180, 270].includes(Number(p.rotation)) ? (Number(p.rotation) as LabelPrintSettings['rotation']) : 0
    return {
      width:  w >= 15 && w <= 120 ? w : DEFAULT_LABEL_SETTINGS.width,
      height: h >= 10 && h <= 120 ? h : DEFAULT_LABEL_SETTINGS.height,
      rotation: r,
    }
  } catch { return DEFAULT_LABEL_SETTINGS }
}

export function saveLabelSettings(s: LabelPrintSettings): void {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)) } catch { /* مفيش تخزين متاح */ }
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

async function labelBlock(label: BarcodeLabel): Promise<string> {
  const qrDataUrl = await QRCode.toDataURL(label.code, {
    width: 240, margin: 1, errorCorrectionLevel: 'M',
    color: { dark: '#000000', light: '#ffffff' },
  })
  const caption = escapeHtml(labelCaption(label))
  const battery = label.battery != null ? ` · ${batteryHtml(label.battery)}` : ''
  return `
    <div class="label">
      <img class="qr" src="${qrDataUrl}" />
      <div class="name">${caption}${battery}</div>
    </div>`
}

export async function printBarcodeLabels(items: { label: BarcodeLabel; copies: number }[]): Promise<void> {
  const { width: pw, height: ph, rotation } = loadLabelSettings()
  // مساحة تصميم الليبل (بعد التدوير بتتبدل الأبعاد)
  const sideways = rotation === 90 || rotation === 270
  const cw = sideways ? ph : pw
  const ch = sideways ? pw : ph
  const qr = Math.round(Math.min(ch * 0.66, cw * 0.45) * 10) / 10
  const font = Math.max(5.5, Math.min(11, Math.min(ch / 24.5, cw / 38) * 7))
  const transform =
    rotation === 90  ? `translate(${pw}mm, 0) rotate(90deg)`
    : rotation === 270 ? `translate(0, ${ph}mm) rotate(-90deg)`
    : rotation === 180 ? `translate(${pw}mm, ${ph}mm) rotate(180deg)`
    : 'none'

  const blocks: string[] = []
  for (const { label, copies } of items) {
    const block = await labelBlock(label)
    for (let i = 0; i < copies; i++) blocks.push(`<div class="page">${block}</div>`)
  }

  const html = `<!DOCTYPE html><html><head>
  <meta charset="UTF-8">
  <title>ليبل</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    @page { size: ${pw}mm ${ph}mm; margin: 0; }
    html, body { background:#fff; width:${pw}mm; }
    .page { position: relative; width:${pw}mm; height:${ph}mm; overflow:hidden; break-inside:avoid; }
    .page + .page { break-before: page; }
    .label {
      contain: size;
      position: absolute; top:0; left:0;
      width: ${cw}mm;
      height: ${ch}mm;
      transform-origin: 0 0;
      transform: ${transform};
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.4mm;
      overflow: hidden;
    }
    .qr { width: ${qr}mm; height: ${qr}mm; display: block; }
    .bat { white-space: nowrap; }
    .bat-icon { width: 4.2mm; height: 2.1mm; vertical-align: -0.2mm; margin-inline-end: 0.6mm; }
    .name {
      width: ${cw - 2}mm;
      font: 700 ${font}pt/1.1 Arial, Tahoma, sans-serif;
      text-align: center;
      color: #000;
      max-height: 2.4em;
      overflow: hidden;
    }
  </style>
  </head><body>
  ${blocks.join('')}
  <script>window.onload=function(){window.print()};<\/script>
  </body></html>`

  const win = window.open('', '_blank')
  if (win) { win.document.write(html); win.document.close() }
}
