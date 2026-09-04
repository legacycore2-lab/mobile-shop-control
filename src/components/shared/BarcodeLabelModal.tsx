// src/components/shared/BarcodeLabelModal.tsx
// ── Barcode Label Generator — QR (canvas) + CODE-128 (SVG) ───────────────────

import React, { useRef, useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { X, Printer, QrCode } from 'lucide-react'

// ── QR Code ───────────────────────────────────────────────────────────────────

function QRCanvas({ value, size = 140 }: { value: string; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [error, setError] = useState(false)
  useEffect(() => {
    if (!canvasRef.current) return
    QRCode.toCanvas(canvasRef.current, value, {
      width: size, margin: 1,
      color: { dark: '#000000', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    }).catch(() => setError(true))
  }, [value, size])
  if (error) return <div style={{ width: size, height: size, background: '#f3f4f6', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 10, color: '#9ca3af' }}>QR Error</span></div>
  return <canvas ref={canvasRef} width={size} height={size} style={{ borderRadius: 4 }} />
}

// ── CODE-128 Barcode (zero deps) ──────────────────────────────────────────────

const C128: string[] = [
  '11011001100','11001101100','11001100110','10010011000','10010001100',
  '10001001100','10011001000','10011000100','10001100100','11001001000',
  '11001000100','11000100100','10110011100','10011011100','10011001110',
  '10111001100','10011101100','10011100110','11001110010','11001011100',
  '11001001110','11011100100','11001110100','11101101110','11101001100',
  '11100101100','11100100110','11101100100','11100110100','11100110010',
  '11011011000','11011000110','11000110110','10100011000','10001011000',
  '10001000110','10110001000','10001101000','10001100010','11010001000',
  '11000101000','11000100010','10110111000','10110001110','10001101110',
  '10111011000','10111000110','10001110110','11101110110','11010001110',
  '11000101110','11011101000','11011100010','11011101110','11101011000',
  '11101000110','11100010110','11101101000','11101100010','11100011010',
  '11101111010','11001000010','11110001010','10100110000','10100001100',
  '10010110000','10010000110','10000101100','10000100110','10110010000',
  '10110000100','10011010000','10011000010','10000110100','10000110010',
  '11000010010','11001010000','11110111010','11000010100','10001111010',
  '10100111100','10010111100','10010011110','10111100100','10011110100',
  '10011110010','11110100100','11110010100','11110010010','11011011110',
  '11011110110','11110110110','10101111000','10100011110','10001011110',
  '10111101000','10111100010','11110101000','11110100010','10111011110',
  '10111101110','11101011110','11110101110','11010000100','11010010000',
  '11010011100','11000111010',
]

function encode128(text: string): string {
  const safe = text.replace(/[^\x20-\x7E]/g, '').substring(0, 48)
  const vals: number[] = [104]
  for (let i = 0; i < safe.length; i++) {
    const code = safe.charCodeAt(i) - 32
    if (code >= 0 && code <= 95) vals.push(code)
  }
  let checksum = 104
  for (let i = 1; i < vals.length; i++) checksum += vals[i] * i
  vals.push(checksum % 103)
  vals.push(106)
  return vals.map(v => C128[v] ?? '').join('')
}

function Barcode128({ value, width = 220, height = 50 }: { value: string; width?: number; height?: number }) {
  const bits = encode128(value)
  if (!bits) return null
  const modW = (width - 16) / bits.length
  const bars: React.ReactElement[] = []
  let x = 8
  for (let i = 0; i < bits.length; i++) {
    if (bits[i] === '1') bars.push(<rect key={i} x={x} y={0} width={modW} height={height} fill="#000" />)
    x += modW
  }
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
      <rect x={0} y={0} width={width} height={height} fill="#fff" />
      {bars}
    </svg>
  )
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface BarcodeLabel {
  type:          'product' | 'device'
  code:          string
  name:          string
  subName?:      string
  price?:        number        // selling price
  cost_price?:   number        // purchase price
  extra?:        string
  // device extras
  imei1?:        string
  imei2?:        string
  storage?:      string
  color?:        string
  condition?:    string
  warranty?:     string
  supplier?:     string
  invoice?:      string
  // product extras
  sku?:          string
  category?:     string
  quantity?:     number
  unit?:         string
}

interface Props { label: BarcodeLabel; onClose: () => void }

// ── Print ─────────────────────────────────────────────────────────────────────

async function printLabel(label: BarcodeLabel, copies: number) {
  const qrDataUrl = await QRCode.toDataURL(label.code, {
    width: 200, margin: 1, errorCorrectionLevel: 'M',
    color: { dark: '#000000', light: '#ffffff' },
  })

  const condLabel = label.condition === 'new' ? 'جديد' : label.condition === 'used' ? 'مستعمل' : label.condition === 'refurbished' ? 'مجدد' : (label.condition ?? '')

  const infoRows = label.type === 'device' ? [
    label.imei1      ? `<tr><td class="lbl">IMEI 1</td><td class="val">${label.imei1}</td></tr>` : '',
    label.imei2      ? `<tr><td class="lbl">IMEI 2</td><td class="val">${label.imei2}</td></tr>` : '',
    label.storage    ? `<tr><td class="lbl">التخزين</td><td class="val">${label.storage}</td></tr>` : '',
    label.color      ? `<tr><td class="lbl">اللون</td><td class="val">${label.color}</td></tr>` : '',
    label.condition  ? `<tr><td class="lbl">الحالة</td><td class="val">${condLabel}</td></tr>` : '',
    label.warranty   ? `<tr><td class="lbl">الضمان</td><td class="val">${label.warranty}</td></tr>` : '',
    label.supplier   ? `<tr><td class="lbl">المورد</td><td class="val">${label.supplier}</td></tr>` : '',
    label.invoice    ? `<tr><td class="lbl">الفاتورة</td><td class="val">${label.invoice}</td></tr>` : '',
  ].join('') : [
    label.category   ? `<tr><td class="lbl">الفئة</td><td class="val">${label.category}</td></tr>` : '',
    label.sku        ? `<tr><td class="lbl">SKU</td><td class="val">${label.sku}</td></tr>` : '',
    label.quantity   ? `<tr><td class="lbl">الكمية</td><td class="val">${label.quantity} ${label.unit ?? 'قطعة'}</td></tr>` : '',
    label.extra      ? `<tr><td class="lbl">ملاحظات</td><td class="val">${label.extra}</td></tr>` : '',
  ].join('')

  const singleLabel = `
    <div class="label">
      <div class="shop-name">Mobile Shop Control</div>
      <div class="title">${label.name}</div>
      ${label.subName ? `<div class="subtitle">${label.subName}</div>` : ''}

      ${infoRows ? `<table class="info">${infoRows}</table>` : ''}

      <div class="prices">
        ${label.cost_price ? `<div class="price-box cost"><div class="plbl">سعر الشراء</div><div class="pval">${label.cost_price.toLocaleString('en-US')} ج</div></div>` : ''}
        ${label.price ? `<div class="price-box sell"><div class="plbl">سعر البيع</div><div class="pval">${label.price.toLocaleString('en-US')} ج</div></div>` : ''}
      </div>

      <div class="codes">
        <img src="${qrDataUrl}" width="80" height="80" />
        <div class="barcode-wrap">
          <div id="bc_${Math.random().toString(36).slice(2)}"></div>
          <div class="code-text">${label.code}</div>
        </div>
      </div>
    </div>`

  const html = `<!DOCTYPE html><html dir="rtl" lang="ar"><head>
  <meta charset="UTF-8">
  <title>ليبل — ${label.name}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box;}
    body{font-family:'Segoe UI',Arial,sans-serif;background:#f5f5f5;direction:rtl;}
    .wrap{display:flex;flex-wrap:wrap;gap:6px;padding:8px;justify-content:flex-start;}
    .label{width:80mm;background:#fff;border:1px solid #d1d5db;border-radius:5px;padding:7px;page-break-inside:avoid;}
    .shop-name{font-size:8px;font-weight:800;color:#1d4ed8;margin-bottom:3px;}
    .title{font-size:12px;font-weight:800;color:#111;text-align:center;margin-bottom:2px;}
    .subtitle{font-size:9px;color:#555;text-align:center;margin-bottom:4px;}
    .info{width:100%;border-collapse:collapse;margin-bottom:5px;font-size:9px;}
    .info td{padding:2px 4px;border:1px solid #f0f0f0;}
    .lbl{color:#6b7280;width:35%;}
    .val{font-weight:600;color:#111;}
    .prices{display:flex;gap:4px;margin-bottom:5px;}
    .price-box{flex:1;padding:3px 5px;border-radius:3px;text-align:center;}
    .price-box.cost{background:#fff7ed;border:1px solid #fed7aa;}
    .price-box.sell{background:#f0fdf4;border:1px solid #bbf7d0;}
    .plbl{font-size:8px;color:#6b7280;}
    .pval{font-size:11px;font-weight:800;}
    .cost .pval{color:#c2410c;}.sell .pval{color:#15803d;}
    .codes{display:flex;align-items:center;gap:6px;border-top:1px solid #e5e7eb;padding-top:5px;}
    .barcode-wrap{flex:1;text-align:center;}
    .code-text{font-size:7px;font-family:monospace;color:#374151;margin-top:1px;}
    svg.bc{max-width:100%;height:auto;}
    @media print{body{background:#fff;}.wrap{padding:0;gap:4px;}.label{border:1px solid #ccc;}}
  </style>
  </head><body>
  <div class="wrap">
    ${Array.from({ length: copies }).map(() => singleLabel).join('')}
  </div>
  <script>
    // Draw barcodes using CODE-128
    const C128=['11011001100','11001101100','11001100110','10010011000','10010001100','10001001100','10011001000','10011000100','10001100100','11001001000','11001000100','11000100100','10110011100','10011011100','10011001110','10111001100','10011101100','10011100110','11001110010','11001011100','11001001110','11011100100','11001110100','11101101110','11101001100','11100101100','11100100110','11101100100','11100110100','11100110010','11011011000','11011000110','11000110110','10100011000','10001011000','10001000110','10110001000','10001101000','10001100010','11010001000','11000101000','11000100010','10110111000','10110001110','10001101110','10111011000','10111000110','10001110110','11101110110','11010001110','11000101110','11011101000','11011100010','11011101110','11101011000','11101000110','11100010110','11101101000','11101100010','11100011010','11101111010','11001000010','11110001010','10100110000','10100001100','10010110000','10010000110','10000101100','10000100110','10110010000','10110000100','10011010000','10011000010','10000110100','10000110010','11000010010','11001010000','11110111010','11000010100','10001111010','10100111100','10010111100','10010011110','10111100100','10011110100','10011110010','11110100100','11110010100','11110010010','11011011110','11011110110','11110110110','10101111000','10100011110','10001011110','10111101000','10111100010','11110101000','11110100010','10111011110','10111101110','11101011110','11110101110','11010000100','11010010000','11010011100','11000111010'];
    function bc(code){const s=code.replace(/[^\\x20-\\x7E]/g,'').substring(0,48);const v=[104];for(let i=0;i<s.length;i++){const c=s.charCodeAt(i)-32;if(c>=0&&c<=95)v.push(c);}let ck=104;for(let i=1;i<v.length;i++)ck+=v[i]*i;v.push(ck%103);v.push(106);return v.map(x=>C128[x]||'').join('');}
    function drawBC(el,code){const bits=bc(code);if(!bits)return;const W=160,H=42,mw=(W-16)/bits.length;const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 '+W+' '+H);svg.setAttribute('class','bc');svg.setAttribute('width',W);svg.setAttribute('height',H);const bg=document.createElementNS('http://www.w3.org/2000/svg','rect');bg.setAttribute('width',W);bg.setAttribute('height',H);bg.setAttribute('fill','#fff');svg.appendChild(bg);let x=8;for(let i=0;i<bits.length;i++){if(bits[i]==='1'){const r=document.createElementNS('http://www.w3.org/2000/svg','rect');r.setAttribute('x',x);r.setAttribute('y',0);r.setAttribute('width',mw);r.setAttribute('height',H);r.setAttribute('fill','#000');svg.appendChild(r);}x+=mw;}el.appendChild(svg);}
    document.querySelectorAll('[id^="bc_"]').forEach(el=>{drawBC(el,'${label.code}');});
    window.onload=()=>window.print();
  </script>
  </body></html>`

  const win = window.open('', '_blank')
  if (win) { win.document.write(html); win.document.close() }
}

// ── Main Modal ────────────────────────────────────────────────────────────────

export function BarcodeLabelModal({ label, onClose }: Props) {
  const [copies, setCopies] = useState(1)
  const condLabel = label.condition === 'new' ? 'جديد' : label.condition === 'used' ? 'مستعمل' : label.condition === 'refurbished' ? 'مجدد' : (label.condition ?? '')

  const deviceFields = label.type === 'device' ? [
    label.imei1     && ['IMEI 1',     label.imei1],
    label.imei2     && ['IMEI 2',     label.imei2],
    label.storage   && ['التخزين',   label.storage],
    label.color     && ['اللون',      label.color],
    label.condition && ['الحالة',     condLabel],
    label.warranty  && ['الضمان',     label.warranty],
    label.supplier  && ['المورد',     label.supplier],
    label.invoice   && ['الفاتورة',   label.invoice],
  ].flatMap(x => x ? [x as [string,string]] : []) : [
    label.category  && ['الفئة',     label.category],
    label.sku       && ['SKU',        label.sku],
    label.quantity  && ['الكمية',    `${label.quantity} ${label.unit ?? 'قطعة'}`],
    label.extra     && ['ملاحظات',   label.extra],
  ].flatMap(x => x ? [x as [string,string]] : [])

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <QrCode size={18} className="text-blue-600 dark:text-blue-400" />
            <h2 className="text-base font-bold text-gray-900 dark:text-white">باركود جاهز للطباعة</h2>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Preview */}
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">

          {/* Main info */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 space-y-1">
            <p className="font-bold text-gray-900 dark:text-white text-sm text-center">{label.name}</p>
            {label.subName && <p className="text-xs text-gray-500 dark:text-gray-400 text-center">{label.subName}</p>}
          </div>

          {/* Detail fields */}
          {deviceFields.length > 0 && (
            <div className="grid grid-cols-2 gap-1.5">
              {deviceFields.map(([l, v]) => (
                <div key={l} className="bg-gray-50 dark:bg-gray-800 rounded-lg px-2.5 py-1.5 border border-gray-200 dark:border-gray-700">
                  <div className="text-xs text-gray-400 dark:text-gray-500">{l}</div>
                  <div className="text-xs font-semibold text-gray-900 dark:text-white font-mono mt-0.5">{v}</div>
                </div>
              ))}
            </div>
          )}

          {/* Prices */}
          <div className="flex gap-2">
            {label.cost_price !== undefined && label.cost_price > 0 && (
              <div className="flex-1 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg px-3 py-2 text-center">
                <div className="text-xs text-gray-500 dark:text-gray-400">سعر الشراء</div>
                <div className="text-sm font-bold text-orange-700 dark:text-orange-400">{label.cost_price.toLocaleString('en-US')} ج</div>
              </div>
            )}
            {label.price !== undefined && label.price > 0 && (
              <div className="flex-1 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg px-3 py-2 text-center">
                <div className="text-xs text-gray-500 dark:text-gray-400">سعر البيع</div>
                <div className="text-sm font-bold text-green-700 dark:text-green-400">{label.price.toLocaleString('en-US')} ج</div>
              </div>
            )}
          </div>

          {/* QR + Barcode preview */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex flex-col items-center gap-3">
            <QRCanvas value={label.code} size={130} />
            <Barcode128 value={label.code} width={220} height={48} />
            <p className="font-mono text-xs text-gray-500 tracking-wider">{label.code}</p>
          </div>

          {/* Copies */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">عدد النسخ</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setCopies(c => Math.max(1, c - 1))}
                className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold text-lg flex items-center justify-center hover:bg-gray-50 transition-colors">−</button>
              <span className="w-8 text-center text-sm font-bold text-gray-900 dark:text-white">{copies}</span>
              <button onClick={() => setCopies(c => Math.min(10, c + 1))}
                className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold text-lg flex items-center justify-center hover:bg-gray-50 transition-colors">+</button>
            </div>
          </div>

          <p className="text-xs text-gray-400 text-center">QR Code + CODE-128 — يعمل مع الكاميرا والـ USB Scanner</p>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 pb-5">
          <button onClick={onClose}
            className="flex-1 h-10 text-sm font-medium rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            إغلاق
          </button>
          <button onClick={() => void printLabel(label, copies)}
            className="flex-1 h-10 text-sm font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors flex items-center justify-center gap-2">
            <Printer size={15} /> طباعة {copies > 1 ? `(${copies} نسخ)` : ''}
          </button>
        </div>
      </div>
    </div>
  )
}
