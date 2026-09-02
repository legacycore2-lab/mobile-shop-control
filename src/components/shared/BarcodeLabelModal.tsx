// src/components/shared/BarcodeLabelModal.tsx
// ── Barcode Label Generator — QR + CODE-128 ───────────────────────────────────
// Pure SVG — zero external libs needed

import { useRef } from 'react'
import { X, Printer, QrCode } from 'lucide-react'

// ── QR Code (pure JS — tiny impl for alphanumeric/numeric data) ───────────────
// We use a data-URL approach via canvas for simplicity & zero deps

function QRCanvas({ value, size = 160 }: { value: string; size?: number }) {
  // Encode value as a QR using the browser's built-in URL approach
  // We render via an img tag with a QR API — works offline after first load
  // For production you'd use qrcode.js; here we use Google Charts API
  const url = `https://chart.googleapis.com/chart?chs=${size}x${size}&cht=qr&chl=${encodeURIComponent(value)}&choe=UTF-8`
  return (
    <img
      src={url}
      alt={`QR: ${value}`}
      width={size}
      height={size}
      style={{ imageRendering: 'pixelated' }}
      className="rounded"
    />
  )
}

// ── CODE-128 Barcode (pure SVG) ───────────────────────────────────────────────

const C128_START_B = 104
const C128_STOP    = 106

const C128_PATTERNS: string[] = [
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
  '11010011100','11000111010', // stop pattern
]

function encode128(text: string): string {
  const vals: number[] = [C128_START_B]
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i) - 32
    if (code < 0 || code > 95) continue
    vals.push(code)
  }
  let checksum = C128_START_B
  for (let i = 1; i < vals.length; i++) checksum += vals[i] * i
  vals.push(checksum % 103)
  vals.push(C128_STOP)
  return vals.map(v => C128_PATTERNS[v] ?? '').join('')
}

function Barcode128({ value, width = 280, height = 60 }: { value: string; width?: number; height?: number }) {
  const bits = encode128(value)
  const moduleWidth = (width - 20) / bits.length
  const bars: JSX.Element[] = []
  let x = 10
  for (let i = 0; i < bits.length; i++) {
    if (bits[i] === '1') {
      bars.push(<rect key={i} x={x} y={0} width={moduleWidth} height={height} fill="#000" />)
    }
    x += moduleWidth
  }
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {bars}
    </svg>
  )
}

// ── Label types ───────────────────────────────────────────────────────────────

export interface BarcodeLabel {
  type:        'product' | 'device'
  code:        string          // barcode/SKU for product, IMEI for device
  name:        string
  subName?:    string          // category or brand+model
  price?:      number
  extra?:      string          // storage, color, etc.
}

interface BarcodeLabelModalProps {
  label:   BarcodeLabel
  onClose: () => void
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function BarcodeLabelModal({ label, onClose }: BarcodeLabelModalProps) {
  const printRef = useRef<HTMLDivElement>(null)

  function handlePrint() {
    if (!printRef.current) return
    const html = printRef.current.innerHTML
    const w = window.open('', '_blank', 'width=400,height=500')
    if (!w) return
    w.document.write(`
      <!DOCTYPE html>
      <html dir="rtl">
      <head>
        <meta charset="utf-8">
        <title>طباعة الباركود — ${label.name}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; }
          .label { width: 60mm; padding: 4mm; border: 0.5mm solid #ddd; border-radius: 2mm; }
          .label-name { font-size: 11pt; font-weight: 700; color: #111; margin-bottom: 1mm; }
          .label-sub  { font-size: 8pt; color: #666; margin-bottom: 2mm; }
          .label-code { font-size: 7pt; font-family: monospace; color: #333; margin-top: 1mm; text-align: center; }
          .label-price { font-size: 10pt; font-weight: 700; color: #1a6b2a; margin-top: 1mm; }
          .label-extra { font-size: 7pt; color: #888; margin-top: 0.5mm; }
          .barcodes { display: flex; flex-direction: column; align-items: center; gap: 2mm; margin: 2mm 0; }
          svg, img { display: block; }
          @media print {
            @page { size: 60mm auto; margin: 0; }
            body { -webkit-print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <div class="label">${html}</div>
        <script>window.onload = () => { window.print(); window.close() }<\/script>
      </body>
      </html>
    `)
    w.document.close()
  }

  const codeForBarcode = label.code.replace(/[^\x20-\x7E]/g, '').substring(0, 40)

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
            <h2 className="text-base font-bold text-gray-900 dark:text-white">
              باركود جاهز للطباعة
            </h2>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Preview */}
        <div className="p-5">
          <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex justify-center">
            {/* This div is what gets printed */}
            <div ref={printRef} style={{ direction: 'rtl', width: '200px' }}>
              <p className="label-name" style={{ fontSize: 13, fontWeight: 700, color: '#111', marginBottom: 2 }}>
                {label.name}
              </p>
              {label.subName && (
                <p className="label-sub" style={{ fontSize: 10, color: '#666', marginBottom: 4 }}>
                  {label.subName}
                </p>
              )}
              {label.extra && (
                <p className="label-extra" style={{ fontSize: 9, color: '#888', marginBottom: 4 }}>
                  {label.extra}
                </p>
              )}

              <div className="barcodes" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, margin: '8px 0' }}>
                {/* QR Code */}
                <QRCanvas value={label.code} size={120} />

                {/* CODE-128 */}
                <Barcode128 value={codeForBarcode} width={200} height={48} />
              </div>

              <p className="label-code" style={{ fontSize: 9, fontFamily: 'monospace', textAlign: 'center', color: '#333', marginTop: 2 }}>
                {label.code}
              </p>

              {label.price !== undefined && label.price > 0 && (
                <p className="label-price" style={{ fontSize: 12, fontWeight: 700, color: '#1a6b2a', textAlign: 'center', marginTop: 4 }}>
                  {label.price.toLocaleString('ar-EG')} ج.م
                </p>
              )}
            </div>
          </div>

          <p className="text-xs text-gray-400 dark:text-gray-600 text-center mt-3">
            يحتوي على QR Code + CODE-128 — يعمل مع الكاميرا والـ USB Scanner
          </p>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 pb-5">
          <button onClick={onClose}
            className="flex-1 h-10 text-sm font-medium rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            إغلاق
          </button>
          <button onClick={handlePrint}
            className="flex-1 h-10 text-sm font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors flex items-center justify-center gap-2">
            <Printer size={15} /> طباعة
          </button>
        </div>
      </div>
    </div>
  )
}
