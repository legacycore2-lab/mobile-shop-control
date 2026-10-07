// src/components/shared/BarcodeLabelModal.tsx
// ── Barcode Label Generator — QR Only — 1.50 in × 0.98 in (38mm × 25mm) ─────

import React, { useRef, useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { X, Printer, QrCode } from 'lucide-react'

// ── QR Canvas Preview ─────────────────────────────────────────────────────────

function QRCanvas({ value, size = 140 }: { value: string; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [error, setError]   = useState(false)
  useEffect(() => {
    if (!canvasRef.current) return
    QRCode.toCanvas(canvasRef.current, value, {
      width: size, margin: 1,
      color: { dark: '#000000', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    }).catch(() => setError(true))
  }, [value, size])
  if (error)
    return (
      <div style={{ width: size, height: size, background: '#f3f4f6', borderRadius: 4,
        display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 10, color: '#9ca3af' }}>QR Error</span>
      </div>
    )
  return <canvas ref={canvasRef} width={size} height={size} style={{ borderRadius: 4 }} />
}

// ── Types ─────────────────────────────────────────────────────────────────────

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
  warranty?:     string
  supplier?:     string
  invoice?:      string
  sku?:          string
  category?:     string
  quantity?:     number
  unit?:         string
}

interface Props { label: BarcodeLabel; onClose: () => void }

// ── Print — 38mm × 25mm QR-only label ────────────────────────────────────────

async function printLabel(label: BarcodeLabel, copies: number) {
  const qrDataUrl = await QRCode.toDataURL(label.code, {
    width: 240, margin: 1, errorCorrectionLevel: 'M',
    color: { dark: '#000000', light: '#ffffff' },
  })

  const singleLabel = `
    <div class="label">
      <img class="qr" src="${qrDataUrl}" />
    </div>`

  const html = `<!DOCTYPE html><html><head>
  <meta charset="UTF-8">
  <title>ليبل</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    @page { size: 38mm 25mm; margin: 0; }
    body { background:#fff; width:38mm; height:25mm; overflow:hidden; }
    .wrap { display:flex; flex-direction:column; gap:0; }
    .label {
      width: 38mm;
      height: 25mm;
      display: flex;
      align-items: center;
      justify-content: center;
      page-break-after: always;
      overflow: hidden;
    }
    .qr { width: 23mm; height: 23mm; }
  </style>
  </head><body>
  <div class="wrap">
    ${Array.from({ length: copies }).map(() => singleLabel).join('')}
  </div>
  <script>window.print();<\/script>
  </body></html>`

  const win = window.open('', '_blank')
  if (win) { win.document.write(html); win.document.close() }
}

// ── Main Modal ────────────────────────────────────────────────────────────────

export function BarcodeLabelModal({ label, onClose }: Props) {
  const [copies, setCopies] = useState(1)
  const condLabel =
    label.condition === 'new'         ? 'جديد'
    : label.condition === 'used'      ? 'مستعمل'
    : label.condition === 'refurbished' ? 'مجدد'
    : (label.condition ?? '')

  const deviceFields = label.type === 'device' ? [
    label.imei1     && ['IMEI 1',   label.imei1],
    label.imei2     && ['IMEI 2',   label.imei2],
    label.storage   && ['التخزين', label.storage],
    label.color     && ['اللون',    label.color],
    label.condition && ['الحالة',   condLabel],
    label.warranty  && ['الضمان',   label.warranty],
    label.supplier  && ['المورد',   label.supplier],
    label.invoice   && ['الفاتورة', label.invoice],
  ].flatMap(x => x ? [x as [string, string]] : []) : [
    label.category  && ['الفئة',    label.category],
    label.sku       && ['SKU',       label.sku],
    label.quantity  && ['الكمية',   `${label.quantity} ${label.unit ?? 'قطعة'}`],
    label.extra     && ['ملاحظات',  label.extra],
  ].flatMap(x => x ? [x as [string, string]] : [])

  return (
    <div
      className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <QrCode size={18} className="text-blue-600 dark:text-blue-400" />
            <h2 className="text-base font-bold text-gray-900 dark:text-white">باركود جاهز للطباعة</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Preview */}
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">

          {/* Main info */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 space-y-1">
            <p className="font-bold text-gray-900 dark:text-white text-sm text-center">{label.name}</p>
            {label.subName && (
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">{label.subName}</p>
            )}
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
                <div className="text-sm font-bold text-orange-700 dark:text-orange-400">
                  {label.cost_price.toLocaleString('en-US')} ج
                </div>
              </div>
            )}
            {label.price !== undefined && label.price > 0 && (
              <div className="flex-1 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg px-3 py-2 text-center">
                <div className="text-xs text-gray-500 dark:text-gray-400">سعر البيع</div>
                <div className="text-sm font-bold text-green-700 dark:text-green-400">
                  {label.price.toLocaleString('en-US')} ج
                </div>
              </div>
            )}
          </div>

          {/* QR preview only */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex flex-col items-center gap-2">
            <QRCanvas value={label.code} size={140} />
            <p className="font-mono text-xs text-gray-500 tracking-wider">{label.code}</p>
          </div>

          {/* Label size note */}
          <p className="text-xs text-gray-400 text-center">
            مقاس الليبل: 1.50 × 0.98 in — Xprinter XP-233B
          </p>

          {/* Copies */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">عدد النسخ</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCopies(c => Math.max(1, c - 1))}
                className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold text-lg flex items-center justify-center hover:bg-gray-50 transition-colors"
              >−</button>
              <span className="w-8 text-center text-sm font-bold text-gray-900 dark:text-white">{copies}</span>
              <button
                onClick={() => setCopies(c => Math.min(10, c + 1))}
                className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold text-lg flex items-center justify-center hover:bg-gray-50 transition-colors"
              >+</button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 pb-5">
          <button
            onClick={onClose}
            className="flex-1 h-10 text-sm font-medium rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            إغلاق
          </button>
          <button
            onClick={() => void printLabel(label, copies)}
            className="flex-1 h-10 text-sm font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors flex items-center justify-center gap-2"
          >
            <Printer size={15} /> طباعة {copies > 1 ? `(${copies} نسخ)` : ''}
          </button>
        </div>
      </div>
    </div>
  )
}
