// src/components/shared/BarcodeLabelModal.tsx
// ── Barcode Label Generator — QR (canvas) + CODE-128 (SVG) ───────────────────
// Zero external API calls — works fully offline

import React, { useRef, useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { X, Printer, QrCode } from 'lucide-react'

// ── QR Code via canvas (pure JS — offline) ───────────────────────────────────

function QRCanvas({ value, size = 140 }: { value: string; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!canvasRef.current) return
    QRCode.toCanvas(canvasRef.current, value, {
      width: size,
      margin: 1,
      color: { dark: '#000000', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    }).catch(() => setError(true))
  }, [value, size])

  if (error) return (
    <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6', borderRadius: 4 }}>
      <span style={{ fontSize: 10, color: '#9ca3af', textAlign: 'center' }}>QR Error</span>
    </div>
  )

  return <canvas ref={canvasRef} width={size} height={size} style={{ borderRadius: 4 }} />
}

// ── CODE-128 Barcode (pure SVG — zero deps) ───────────────────────────────────

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
  '11010011100','11000111010',
]

function encode128(text: string): string {
  const safe = text.replace(/[^\x20-\x7E]/g, '').substring(0, 48)
  const vals: number[] = [104] // START B
  for (let i = 0; i < safe.length; i++) {
    const code = safe.charCodeAt(i) - 32
    if (code >= 0 && code <= 95) vals.push(code)
  }
  let checksum = 104
  for (let i = 1; i < vals.length; i++) checksum += vals[i] * i
  vals.push(checksum % 103)
  vals.push(106) // STOP
  return vals.map(v => C128_PATTERNS[v] ?? '').join('')
}

function Barcode128({ value, width = 220, height = 56 }: { value: string; width?: number; height?: number }) {
  const bits = encode128(value)
  if (!bits) return null
  const modW = (width - 16) / bits.length
  const bars: React.ReactElement[] = []
  let x = 8
  for (let i = 0; i < bits.length; i++) {
    if (bits[i] === '1') {
      bars.push(<rect key={i} x={x} y={0} width={modW} height={height} fill="#000" />)
    }
    x += modW
  }
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
      <rect x={0} y={0} width={width} height={height} fill="#fff" />
      {bars}
    </svg>
  )
}

// ── Label types ───────────────────────────────────────────────────────────────

export interface BarcodeLabel {
  type:     'product' | 'device'
  code:     string
  name:     string
  subName?: string
  price?:   number
  extra?:   string
}

interface BarcodeLabelModalProps {
  label:   BarcodeLabel
  onClose: () => void
}

// ── Print helper ──────────────────────────────────────────────────────────────

function buildPrintHTML(
  name: string,
  subName: string | undefined,
  extra: string | undefined,
  code: string,
  price: number | undefined,
  qrDataUrl: string,
): string {
  return `
    <!DOCTYPE html>
    <html dir="rtl">
    <head>
      <meta charset="utf-8">
      <title>باركود — ${name}</title>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family: 'Segoe UI', Arial, sans-serif; background:#fff; padding:4mm; }
        .label { width:60mm; }
        .name  { font-size:11pt; font-weight:700; color:#111; margin-bottom:1mm; }
        .sub   { font-size:8pt;  color:#555; margin-bottom:3mm; }
        .extra { font-size:7pt;  color:#888; margin-bottom:2mm; }
        .codes { display:flex; flex-direction:column; align-items:center; gap:3mm; margin:2mm 0; }
        .code  { font-size:7pt;  font-family:monospace; text-align:center; color:#333; margin-top:1mm; }
        .price { font-size:11pt; font-weight:700; color:#1a6b2a; text-align:center; margin-top:2mm; }
        svg    { display:block; }
        @media print {
          @page { size: 62mm auto; margin:2mm; }
          body  { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
        }
      </style>
    </head>
    <body>
      <div class="label">
        <p class="name">${name}</p>
        ${subName ? `<p class="sub">${subName}</p>` : ''}
        ${extra   ? `<p class="extra">${extra}</p>`  : ''}
        <div class="codes">
          <img src="${qrDataUrl}" width="120" height="120" />
        </div>
        <p class="code">${code}</p>
        ${price ? `<p class="price">${price.toLocaleString('ar-EG')} ج.م</p>` : ''}
      </div>
      <script>window.onload=()=>{window.print();window.close()}<\/script>
    </body>
    </html>
  `
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function BarcodeLabelModal({ label, onClose }: BarcodeLabelModalProps) {
  const canvasRef2 = useRef<HTMLCanvasElement | null>(null)

  async function handlePrint() {
    try {
      const qrDataUrl = await QRCode.toDataURL(label.code, {
        width: 240,
        margin: 1,
        errorCorrectionLevel: 'M',
        color: { dark: '#000000', light: '#ffffff' },
      })
      const w = window.open('', '_blank', 'width=420,height=560')
      if (!w) { alert('يرجى السماح بفتح النوافذ المنبثقة'); return }
      w.document.write(buildPrintHTML(
        label.name,
        label.subName,
        label.extra,
        label.code,
        label.price,
        qrDataUrl,
      ))
      w.document.close()
    } catch {
      alert('خطأ في الطباعة')
    }
  }

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
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Preview */}
        <div className="p-5">
          <div className="bg-white border border-gray-200 dark:border-gray-700 rounded-xl p-5 flex flex-col items-center gap-3">
            {/* Name */}
            <div className="text-center">
              <p className="font-bold text-gray-900 text-sm">{label.name}</p>
              {label.subName && <p className="text-xs text-gray-500 mt-0.5">{label.subName}</p>}
              {label.extra   && <p className="text-xs text-gray-400 mt-0.5">{label.extra}</p>}
            </div>

            {/* QR */}
            <QRCanvas value={label.code} size={140} />

            {/* CODE-128 */}
            <Barcode128 value={label.code} width={220} height={52} />

            {/* Code text */}
            <p className="font-mono text-xs text-gray-500 tracking-wider">{label.code}</p>

            {/* Price */}
            {label.price !== undefined && label.price > 0 && (
              <p className="text-base font-bold text-green-700">
                {label.price.toLocaleString('ar-EG')} ج.م
              </p>
            )}
          </div>

          <p className="text-xs text-gray-400 text-center mt-3">
            QR Code + CODE-128 — يعمل مع الكاميرا والـ USB Scanner
          </p>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 pb-5">
          <button onClick={onClose}
            className="flex-1 h-10 text-sm font-medium rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            إغلاق
          </button>
          <button onClick={() => void handlePrint()}
            className="flex-1 h-10 text-sm font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors flex items-center justify-center gap-2">
            <Printer size={15} /> طباعة
          </button>
        </div>
      </div>
    </div>
  )
}
