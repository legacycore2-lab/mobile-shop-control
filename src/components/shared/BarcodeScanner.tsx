// src/components/shared/BarcodeScanner.tsx
// ── Universal Barcode Scanner ─────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback, useId } from 'react'
import { ScanLine, X, Camera, Usb, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/cn'

export type ScannerMode = 'camera' | 'usb'

interface BarcodeScannerProps {
  onScan:       (code: string) => void
  onClose:      () => void
  title?:       string
  placeholder?: string
  validate?:    RegExp
}

// ── USB hook (used both inside modal and externally) ──────────────────────────

export function useUsbScanner(onScan: (code: string) => void, active: boolean) {
  const buf   = useRef('')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!active) return
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.key === 'Enter') {
        const code = buf.current.trim()
        if (code.length >= 4) onScan(code)
        buf.current = ''
        return
      }
      if (e.key.length === 1) {
        buf.current += e.key
        if (timer.current) clearTimeout(timer.current)
        timer.current = setTimeout(() => { buf.current = '' }, 100)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      if (timer.current) clearTimeout(timer.current)
    }
  }, [active, onScan])
}

// ── Camera component ──────────────────────────────────────────────────────────

function CameraScanner({ divId, onScan, onError }: {
  divId:   string
  onScan:  (code: string) => void
  onError: (msg: string) => void
}) {
  const scannerRef  = useRef<{ stop: () => Promise<void>; clear: () => void } | null>(null)
  const stateRef    = useRef<'idle' | 'starting' | 'running' | 'stopping'>('idle')
  const mountedRef  = useRef(true)

  useEffect(() => {
    mountedRef.current = true

    async function start() {
      if (stateRef.current !== 'idle') return
      stateRef.current = 'starting'

      try {
        const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode')
        if (!mountedRef.current) return

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

        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 160 } },
          (text) => { if (mountedRef.current) onScan(text) },
          () => { /* ignore frame errors */ }
        )

        if (!mountedRef.current) {
          stateRef.current = 'stopping'
          await scanner.stop().catch(() => {})
          scanner.clear()
          stateRef.current = 'idle'
          return
        }

        stateRef.current = 'running'
      } catch (err) {
        stateRef.current = 'idle'
        if (mountedRef.current) {
          const msg = err instanceof Error ? err.message : ''
          onError(
            msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('denied')
              ? 'يرجى السماح للمتصفح بالوصول للكاميرا'
              : msg.toLowerCase().includes('not found') || msg.toLowerCase().includes('no camera')
              ? 'لا توجد كاميرا متاحة'
              : 'تعذر تشغيل الكاميرا — جرب طريقة USB'
          )
        }
      }
    }

    void start()

    return () => {
      mountedRef.current = false
      if (stateRef.current === 'running' && scannerRef.current) {
        stateRef.current = 'stopping'
        scannerRef.current.stop()
          .catch(() => {})
          .finally(() => {
            scannerRef.current?.clear()
            stateRef.current = 'idle'
          })
      }
    }
  }, [divId, onScan, onError])

  return (
    <div className="relative rounded-xl overflow-hidden bg-black min-h-48">
      <div id={divId} className="w-full" />
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div className="border-2 border-blue-400 rounded-xl w-56 h-36 opacity-70" />
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function BarcodeScanner({
  onScan, onClose,
  title = 'مسح الباركود',
  placeholder,
  validate,
}: BarcodeScannerProps) {
  const uid         = useId().replace(/:/g, '')
  const divId       = `bcs-${uid}`
  const [mode, setMode]           = useState<ScannerMode>('camera')
  const [manual, setManual]       = useState('')
  const [error, setError]         = useState('')
  const [lastScan, setLastScan]   = useState('')
  const cooldown = useRef(false)

  const handleScan = useCallback((raw: string) => {
    if (cooldown.current) return
    const code = raw.trim()
    if (!code) return
    if (validate && !validate.test(code)) {
      setError(`كود غير صالح: ${code}`)
      return
    }
    cooldown.current = true
    setLastScan(code)
    setError('')
    onScan(code)
    setTimeout(() => { cooldown.current = false }, 1500)
  }, [onScan, validate])

  useUsbScanner(handleScan, mode === 'usb')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (manual.trim()) { handleScan(manual.trim()); setManual('') }
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
            className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 dark:border-gray-800">
          {([['camera', Camera, 'كاميرا'], ['usb', Usb, 'جهاز USB']] as const).map(([key, Icon, label]) => (
            <button key={key} onClick={() => { setMode(key); setError('') }}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors',
                mode === key
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700',
              )}>
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>

        <div className="p-5 space-y-4">

          {mode === 'camera' && (
            <CameraScanner divId={divId} onScan={handleScan} onError={setError} />
          )}

          {mode === 'usb' && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6 text-center space-y-3">
              <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/40 rounded-full flex items-center justify-center mx-auto">
                <Usb size={24} className="text-blue-600 dark:text-blue-400" />
              </div>
              <p className="text-sm font-bold text-blue-800 dark:text-blue-200">جهاز القارئ جاهز</p>
              <p className="text-xs text-blue-600 dark:text-blue-400">اضغط زناد الجهاز على أي باركود</p>
            </div>
          )}

          {lastScan && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg px-4 py-2.5 flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse flex-shrink-0" />
              <p className="text-sm text-green-700 dark:text-green-400 font-mono truncate">{lastScan}</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-2.5 flex items-center gap-2">
              <AlertCircle size={14} className="text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          <form onSubmit={submit} className="flex gap-2">
            <input
              value={manual}
              onChange={e => setManual(e.target.value)}
              placeholder={placeholder ?? 'أو أدخل الكود يدوياً...'}
              dir="ltr"
              className="flex-1 h-9 px-3 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all font-mono"
            />
            <button type="submit" disabled={!manual.trim()}
              className="h-9 px-4 text-sm font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-40">
              إدخال
            </button>
          </form>

        </div>
      </div>
    </div>
  )
}
