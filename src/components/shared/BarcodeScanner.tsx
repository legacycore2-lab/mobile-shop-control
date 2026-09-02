// src/components/shared/BarcodeScanner.tsx
// ── Universal Barcode Scanner ─────────────────────────────────────────────────
// Supports: Camera (mobile/desktop) + USB barcode reader (keyboard emulation)

import { useState, useEffect, useRef, useCallback } from 'react'
import { ScanLine, X, Camera, Usb, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/cn'

// ── Types ─────────────────────────────────────────────────────────────────────

export type ScannerMode = 'camera' | 'usb'

interface BarcodeScannerProps {
  onScan:      (code: string) => void
  onClose:     () => void
  title?:      string
  placeholder?: string
  /** Accept only codes matching this regex */
  validate?:   RegExp
}

// ── USB Scanner Hook ──────────────────────────────────────────────────────────
// USB barcode readers type fast as keyboard input ending with Enter

function useUsbScanner(onScan: (code: string) => void, active: boolean) {
  const bufferRef  = useRef('')
  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!active) return

    function handleKeyDown(e: KeyboardEvent) {
      // Ignore if user is typing in an input/textarea
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return

      if (e.key === 'Enter') {
        const code = bufferRef.current.trim()
        if (code.length >= 4) onScan(code)
        bufferRef.current = ''
        return
      }

      // Only printable chars
      if (e.key.length === 1) {
        bufferRef.current += e.key
        // Clear buffer after 100ms gap (human typing is slower)
        if (timerRef.current) clearTimeout(timerRef.current)
        timerRef.current = setTimeout(() => {
          bufferRef.current = ''
        }, 100)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [active, onScan])
}

// ── Camera Scanner Component ──────────────────────────────────────────────────

function CameraScanner({ onScan, onError }: {
  onScan:  (code: string) => void
  onError: (msg: string)  => void
}) {
  const divId  = 'barcode-scanner-div'
  const scannerRef = useRef<InstanceType<typeof import('html5-qrcode').Html5Qrcode> | null>(null)
  const startedRef = useRef(false)

  useEffect(() => {
    let mounted = true

    async function start() {
      try {
        const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode')

        if (!mounted) return
        const scanner = new Html5Qrcode(divId, {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
          ],
          verbose: false,
        })
        scannerRef.current = scanner
        startedRef.current = true

        await scanner.start(
          { facingMode: 'environment' },
          { fps: 15, qrbox: { width: 280, height: 180 } },
          (decodedText) => {
            if (mounted) onScan(decodedText)
          },
          () => { /* ignore scan errors */ }
        )
      } catch (err) {
        if (mounted) {
          const msg = err instanceof Error ? err.message : 'لا يمكن الوصول للكاميرا'
          onError(msg.includes('permission') ? 'يرجى السماح للمتصفح بالوصول للكاميرا' : msg)
        }
      }
    }

    void start()

    return () => {
      mounted = false
      if (scannerRef.current && startedRef.current) {
        scannerRef.current.stop().catch(() => {}).finally(() => {
          scannerRef.current?.clear()
        })
      }
    }
  }, [onScan, onError])

  return (
    <div className="relative">
      <div id={divId} className="w-full rounded-xl overflow-hidden" />
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div className="border-2 border-blue-500 rounded-lg w-64 h-40 opacity-60" />
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export function BarcodeScanner({
  onScan, onClose, title = 'مسح الباركود', placeholder, validate,
}: BarcodeScannerProps) {
  const [mode,      setMode]      = useState<ScannerMode>('camera')
  const [manualVal, setManualVal] = useState('')
  const [error,     setError]     = useState('')
  const [lastScan,  setLastScan]  = useState('')
  const cooldownRef = useRef(false)

  const handleScan = useCallback((code: string) => {
    if (cooldownRef.current) return
    const clean = code.trim()
    if (!clean) return
    if (validate && !validate.test(clean)) {
      setError(`كود غير صالح: ${clean}`)
      return
    }
    cooldownRef.current = true
    setLastScan(clean)
    setError('')
    onScan(clean)
    // 1.5s cooldown to avoid double-scan
    setTimeout(() => { cooldownRef.current = false }, 1500)
  }, [onScan, validate])

  // USB scanner always active
  useUsbScanner(handleScan, mode === 'usb')

  function handleManual(e: React.FormEvent) {
    e.preventDefault()
    if (manualVal.trim()) {
      handleScan(manualVal.trim())
      setManualVal('')
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white dark:bg-gray-900 w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <ScanLine size={18} className="text-blue-600 dark:text-blue-400" />
            <h2 className="text-base font-bold text-gray-900 dark:text-white">{title}</h2>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Mode tabs */}
        <div className="flex border-b border-gray-100 dark:border-gray-800">
          {[
            { key: 'camera' as ScannerMode, icon: Camera, label: 'كاميرا' },
            { key: 'usb'    as ScannerMode, icon: Usb,    label: 'جهاز USB' },
          ].map(({ key, icon: Icon, label }) => (
            <button key={key} onClick={() => { setMode(key); setError('') }}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors',
                mode === key
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300',
              )}>
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>

        <div className="p-5 space-y-4">

          {/* Camera mode */}
          {mode === 'camera' && (
            <CameraScanner
              onScan={handleScan}
              onError={setError}
            />
          )}

          {/* USB mode */}
          {mode === 'usb' && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-5 text-center space-y-3">
              <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/40 rounded-full flex items-center justify-center mx-auto">
                <Usb size={24} className="text-blue-600 dark:text-blue-400" />
              </div>
              <p className="text-sm font-semibold text-blue-800 dark:text-blue-200">
                جهاز القارئ جاهز
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400">
                اضغط زناد الجهاز على أي باركود
              </p>
            </div>
          )}

          {/* Last scan feedback */}
          {lastScan && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg px-4 py-2.5 flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse flex-shrink-0" />
              <p className="text-sm text-green-700 dark:text-green-400 font-mono truncate">
                {lastScan}
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-2.5 flex items-center gap-2">
              <AlertCircle size={14} className="text-red-600 dark:text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Manual input fallback */}
          <form onSubmit={handleManual} className="flex gap-2">
            <input
              value={manualVal}
              onChange={e => setManualVal(e.target.value)}
              placeholder={placeholder ?? 'أو أدخل الكود يدوياً...'}
              dir="ltr"
              className="flex-1 h-9 px-3 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all font-mono"
            />
            <button type="submit" disabled={!manualVal.trim()}
              className="h-9 px-4 text-sm font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-40">
              إدخال
            </button>
          </form>

        </div>
      </div>
    </div>
  )
}
