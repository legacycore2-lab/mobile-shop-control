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
  const blocks: string[] = []
  for (const { label, copies } of items) {
    const block = await labelBlock(label)
    for (let i = 0; i < copies; i++) blocks.push(block)
  }

  const html = `<!DOCTYPE html><html><head>
  <meta charset="UTF-8">
  <title>ليبل</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    @page { size: 38mm 24.5mm; margin: 0; }
    html, body { background:#fff; width:38mm; }
    .label {
      width: 38mm;
      height: 24mm;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.4mm;
      break-inside: avoid;
      overflow: hidden;
    }
    .label + .label { break-before: page; }
    .qr { width: 16mm; height: 16mm; display: block; }
    .bat { white-space: nowrap; }
    .bat-icon { width: 4.2mm; height: 2.1mm; vertical-align: -0.2mm; margin-inline-end: 0.6mm; }
    .name {
      width: 36mm;
      font: 700 7pt/1.1 Arial, Tahoma, sans-serif;
      text-align: center;
      color: #000;
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }
  </style>
  </head><body>
  ${blocks.join('')}
  <script>window.onload=function(){window.print()};<\/script>
  </body></html>`

  const win = window.open('', '_blank')
  if (win) { win.document.write(html); win.document.close() }
}
