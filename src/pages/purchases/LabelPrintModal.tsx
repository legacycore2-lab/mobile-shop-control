// src/pages/purchases/LabelPrintModal.tsx
import { useEffect, useRef, useState } from 'react'
import { X, Printer, QrCode, Tag, Smartphone, Package } from 'lucide-react'
import QRCode from 'qrcode'
import JsBarcode from 'jsbarcode'
import { fmt } from '@/constants/statusMaps'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DeviceLabelData {
  type: 'device'
  device_id: string
  brand:     string
  model:     string
  imei1:     string
  imei2?:    string
  storage?:  string
  color?:    string
  condition: string
  cost_price:    number
  selling_price: number
  warranty_months?: number
  supplier_name?: string
  invoice_number?: string
}

export interface ProductLabelData {
  type: 'product'
  product_id: string
  name:        string
  category?:   string
  sku?:        string
  barcode?:    string
  cost_price:    number
  selling_price: number
  quantity?:   number
  unit?:       string
}

export type LabelData = DeviceLabelData | ProductLabelData

// ── Label content ─────────────────────────────────────────────────────────────

function getLabelCode(data: LabelData): string {
  if (data.type === 'device') return data.imei1
  return data.barcode ?? data.sku ?? data.product_id.slice(0, 12)
}

function getLabelTitle(data: LabelData): string {
  if (data.type === 'device') return `${data.brand} ${data.model}`
  return data.name
}

// ── QR Canvas ─────────────────────────────────────────────────────────────────

function QrCanvas({ code, size = 128 }: { code: string; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    if (!ref.current) return
    QRCode.toCanvas(ref.current, code, {
      width: size,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
    })
  }, [code, size])
  return <canvas ref={ref} />
}

// ── Barcode SVG ───────────────────────────────────────────────────────────────

function BarcodeDisplay({ code, width = 200 }: { code: string; width?: number }) {
  const ref = useRef<SVGSVGElement>(null)
  useEffect(() => {
    if (!ref.current) return
    try {
      JsBarcode(ref.current, code, {
        format:      'CODE128',
        width:       1.5,
        height:      50,
        displayValue: true,
        fontSize:    11,
        margin:      6,
        background:  '#ffffff',
        lineColor:   '#000000',
      })
    } catch {
      // Invalid barcode chars — try with product ID
    }
  }, [code])
  return <svg ref={ref} style={{ width, maxWidth: '100%' }} />
}

// ── Print function ────────────────────────────────────────────────────────────

async function printLabel(data: LabelData, copies: number) {
  const code   = getLabelCode(data)
  const title  = getLabelTitle(data)
  const today  = new Date().toLocaleDateString('ar-EG')

  // Generate QR as data URL
  const qrDataUrl = await QRCode.toDataURL(code, { width: 150, margin: 2 })

  // Generate barcode SVG string
  const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  try {
    JsBarcode(svgEl, code, { format: 'CODE128', width: 1.5, height: 45, displayValue: true, fontSize: 10, margin: 4 })
  } catch { /* ignore */ }
  const barcodeStr = svgEl.outerHTML

  const labelHtml = Array.from({ length: copies }).map(() => `
    <div class="label">
      <div class="label-header">
        <span class="shop-name">Mobile Shop</span>
        <span class="date">${today}</span>
      </div>

      <div class="title">${title}</div>

      ${data.type === 'device' ? `
        <div class="info-grid">
          <div class="info-row"><span class="info-label">IMEI 1</span><span class="info-value">${data.imei1}</span></div>
          ${data.imei2 ? `<div class="info-row"><span class="info-label">IMEI 2</span><span class="info-value">${data.imei2}</span></div>` : ''}
          ${data.storage ? `<div class="info-row"><span class="info-label">التخزين</span><span class="info-value">${data.storage}</span></div>` : ''}
          ${data.color ? `<div class="info-row"><span class="info-label">اللون</span><span class="info-value">${data.color}</span></div>` : ''}
          <div class="info-row"><span class="info-label">الحالة</span><span class="info-value">${data.condition === 'new' ? 'جديد' : data.condition === 'used' ? 'مستعمل' : 'مجدد'}</span></div>
          ${data.warranty_months ? `<div class="info-row"><span class="info-label">الضمان</span><span class="info-value">${data.warranty_months} شهر</span></div>` : ''}
          ${data.supplier_name ? `<div class="info-row"><span class="info-label">المورد</span><span class="info-value">${data.supplier_name}</span></div>` : ''}
          ${data.invoice_number ? `<div class="info-row"><span class="info-label">الفاتورة</span><span class="info-value">${data.invoice_number}</span></div>` : ''}
        </div>
      ` : `
        <div class="info-grid">
          ${data.category ? `<div class="info-row"><span class="info-label">الفئة</span><span class="info-value">${data.category}</span></div>` : ''}
          ${data.sku ? `<div class="info-row"><span class="info-label">SKU</span><span class="info-value">${data.sku}</span></div>` : ''}
          ${data.quantity ? `<div class="info-row"><span class="info-label">الكمية</span><span class="info-value">${data.quantity} ${data.unit ?? 'قطعة'}</span></div>` : ''}
        </div>
      `}

      <div class="prices">
        <div class="price-box cost">
          <div class="price-label">سعر الشراء</div>
          <div class="price-value">${fmt(data.cost_price)} ج</div>
        </div>
        <div class="price-box sell">
          <div class="price-label">سعر البيع</div>
          <div class="price-value">${fmt(data.selling_price)} ج</div>
        </div>
      </div>

      <div class="codes">
        <div class="qr-section">
          <img src="${qrDataUrl}" alt="QR" width="90" height="90" />
          <div class="code-text">${code}</div>
        </div>
        <div class="barcode-section">
          ${barcodeStr}
        </div>
      </div>
    </div>
  `).join('')

  const html = `<!DOCTYPE html><html dir="rtl" lang="ar"><head>
  <meta charset="UTF-8"><title>طباعة ليبل</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:'Segoe UI',Tahoma,Arial,sans-serif; background:#f5f5f5; direction:rtl; }
    .labels-wrap { display:flex; flex-wrap:wrap; gap:8px; padding:10px; justify-content:center; }
    .label { width:85mm; background:#fff; border:1px solid #ddd; border-radius:6px; padding:8px; page-break-inside:avoid; }
    .label-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; padding-bottom:4px; border-bottom:1px solid #eee; }
    .shop-name { font-size:9px; font-weight:800; color:#1d4ed8; }
    .date { font-size:8px; color:#9ca3af; }
    .title { font-size:13px; font-weight:800; color:#111; margin-bottom:6px; text-align:center; }
    .info-grid { margin-bottom:6px; border:1px solid #f0f0f0; border-radius:4px; overflow:hidden; }
    .info-row { display:flex; justify-content:space-between; padding:3px 6px; border-bottom:1px solid #f5f5f5; }
    .info-row:last-child { border-bottom:none; }
    .info-label { font-size:9px; color:#6b7280; }
    .info-value { font-size:9px; font-weight:600; color:#111; }
    .prices { display:flex; gap:4px; margin-bottom:6px; }
    .price-box { flex:1; padding:4px 6px; border-radius:4px; text-align:center; }
    .price-box.cost { background:#fff7ed; border:1px solid #fed7aa; }
    .price-box.sell { background:#f0fdf4; border:1px solid #bbf7d0; }
    .price-label { font-size:8px; color:#6b7280; }
    .price-value { font-size:12px; font-weight:800; }
    .cost .price-value { color:#c2410c; }
    .sell .price-value { color:#15803d; }
    .codes { display:flex; align-items:center; gap:6px; border-top:1px solid #eee; padding-top:6px; }
    .qr-section { display:flex; flex-direction:column; align-items:center; gap:2px; flex-shrink:0; }
    .code-text { font-size:7px; color:#374151; font-family:monospace; }
    .barcode-section { flex:1; display:flex; align-items:center; justify-content:center; }
    .barcode-section svg { max-width:100%; height:auto; }
    @media print {
      body { background:#fff; }
      .labels-wrap { padding:0; gap:4px; }
      .label { border:1px solid #ccc; }
    }
  </style>
</head><body>
<div class="labels-wrap">${labelHtml}</div>
<script>window.onload=()=>{ window.print(); }</script>
</body></html>`

  const win = window.open('', '_blank')
  if (win) { win.document.write(html); win.document.close() }
}

// ── Main Modal ────────────────────────────────────────────────────────────────

export function LabelPrintModal({ data, onClose }: { data: LabelData; onClose: () => void }) {
  const [copies, setCopies] = useState(1)
  const code  = getLabelCode(data)
  const title = getLabelTitle(data)

  return (
    <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 bg-blue-50 dark:bg-blue-900/20">
          <div className="flex items-center gap-2">
            <Tag size={16} className="text-blue-600 dark:text-blue-400" />
            <div>
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">طباعة ليبل</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{title}</p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
            <X size={15} />
          </button>
        </div>

        <div className="p-5 space-y-4">

          {/* Info */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 mb-3">
              {data.type === 'device'
                ? <Smartphone size={14} className="text-blue-600 dark:text-blue-400" />
                : <Package size={14} className="text-purple-600 dark:text-purple-400" />}
              <span className="text-sm font-bold text-gray-900 dark:text-white">{title}</span>
            </div>

            {data.type === 'device' ? (
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  ['IMEI 1', data.imei1],
                  data.imei2 ? ['IMEI 2', data.imei2] : null,
                  data.storage ? ['التخزين', data.storage] : null,
                  data.color ? ['اللون', data.color] : null,
                  ['الحالة', data.condition === 'new' ? 'جديد' : data.condition === 'used' ? 'مستعمل' : 'مجدد'],
                  data.warranty_months ? ['الضمان', `${data.warranty_months} شهر`] : null,
                  data.supplier_name ? ['المورد', data.supplier_name] : null,
                  data.invoice_number ? ['الفاتورة', data.invoice_number] : null,
                ].flatMap(x => x ? [x as [string,string]] : []).map(([l, v]) => (
                  <div key={l} className="bg-white dark:bg-gray-900 rounded-lg px-2.5 py-1.5 border border-gray-200 dark:border-gray-700">
                    <div className="text-gray-400 dark:text-gray-500">{l}</div>
                    <div className="font-semibold text-gray-900 dark:text-white mt-0.5 font-mono">{v}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  data.category ? ['الفئة', data.category] : null,
                  data.sku ? ['SKU', data.sku] : null,
                  data.barcode ? ['Barcode', data.barcode] : null,
                  data.quantity ? ['الكمية', `${data.quantity} ${data.unit ?? 'قطعة'}`] : null,
                ].flatMap(x => x ? [x as [string,string]] : []).map(([l, v]) => (
                  <div key={l} className="bg-white dark:bg-gray-900 rounded-lg px-2.5 py-1.5 border border-gray-200 dark:border-gray-700">
                    <div className="text-gray-400 dark:text-gray-500">{l}</div>
                    <div className="font-semibold text-gray-900 dark:text-white mt-0.5">{v}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Prices */}
            <div className="flex gap-2 mt-2">
              <div className="flex-1 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg px-3 py-2 text-center">
                <div className="text-xs text-gray-500 dark:text-gray-400">سعر الشراء</div>
                <div className="text-base font-bold text-orange-700 dark:text-orange-400">{fmt(data.cost_price)} ج</div>
              </div>
              <div className="flex-1 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg px-3 py-2 text-center">
                <div className="text-xs text-gray-500 dark:text-gray-400">سعر البيع</div>
                <div className="text-base font-bold text-green-700 dark:text-green-400">{fmt(data.selling_price)} ج</div>
              </div>
            </div>
          </div>

          {/* QR + Barcode preview */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1">
              <QrCode size={11} /> معاينة الكود
            </p>
            <div className="flex items-center gap-4 justify-center">
              <div className="flex flex-col items-center gap-1">
                <QrCanvas code={code} size={90} />
                <span className="text-xs text-gray-400 font-mono">{code.slice(0, 15)}{code.length > 15 ? '...' : ''}</span>
              </div>
              <div className="flex-1 flex items-center justify-center">
                <BarcodeDisplay code={code} width={170} />
              </div>
            </div>
          </div>

          {/* Copies */}
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">عدد النسخ</label>
            <div className="flex items-center gap-2">
              <button onClick={() => setCopies(c => Math.max(1, c - 1))}
                className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold text-lg flex items-center justify-center hover:bg-gray-50 transition-colors">−</button>
              <span className="w-8 text-center text-sm font-bold text-gray-900 dark:text-white">{copies}</span>
              <button onClick={() => setCopies(c => Math.min(10, c + 1))}
                className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold text-lg flex items-center justify-center hover:bg-gray-50 transition-colors">+</button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 pb-5">
          <button onClick={onClose}
            className="flex-1 h-10 text-sm font-medium rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            إغلاق
          </button>
          <button onClick={() => void printLabel(data, copies)}
            className="flex-1 h-10 text-sm font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors flex items-center justify-center gap-2">
            <Printer size={14} /> طباعة {copies > 1 ? `(${copies} نسخ)` : ''}
          </button>
        </div>
      </div>
    </div>
  )
}
