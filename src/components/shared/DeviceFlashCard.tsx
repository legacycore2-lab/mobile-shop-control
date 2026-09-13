// src/components/shared/DeviceFlashCard.tsx
// بطاقة سريعة تظهر لما تسكن IMEI — تختفي تلقائي بعد 5 ثواني
import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, ShoppingCart, AlertCircle, Wrench, RotateCcw, Ban } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { fmt } from '@/lib/fmt'

interface DeviceInfo {
  id:             string
  imei1:          string
  imei2:          string | null
  brand_name:     string
  model_name:     string
  color:          string | null
  storage:        string | null
  condition:      string
  battery_health: number | null
  status:         string
  selling_price:  number
  cost_price:     number
}

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, {
  label:    string
  bg:       string
  text:     string
  dot:      string
  icon:     typeof AlertCircle | null
}> = {
  in_stock:       { label: 'متاح للبيع',   bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-500', icon: null },
  sold:           { label: 'مباع',         bg: 'bg-gray-100   dark:bg-gray-800',       text: 'text-gray-500   dark:text-gray-400',    dot: 'bg-gray-400',    icon: Ban     },
  defective:      { label: 'تالف',         bg: 'bg-red-50     dark:bg-red-900/20',     text: 'text-red-600    dark:text-red-400',     dot: 'bg-red-500',     icon: AlertCircle },
  sent_to_repair: { label: 'في الصيانة',  bg: 'bg-amber-50   dark:bg-amber-900/20',   text: 'text-amber-700  dark:text-amber-400',   dot: 'bg-amber-500',   icon: Wrench  },
  returned:       { label: 'مُعاد',        bg: 'bg-blue-50    dark:bg-blue-900/20',    text: 'text-blue-700   dark:text-blue-400',    dot: 'bg-blue-500',    icon: RotateCcw },
}

const CONDITION_AR: Record<string, string> = {
  new:         'جديد',
  used:        'مستعمل',
  refurbished: 'مجدد',
}

// ── DB lookup ─────────────────────────────────────────────────────────────────

async function lookup(code: string): Promise<DeviceInfo | null> {
  const searchImei = code.includes('/') ? code.split('/')[0].trim() : code.trim()
  const { data } = await supabase
    .from('mobile_devices')
    .select(`
      id, imei1, imei2, color, storage, condition, battery_health,
      status, selling_price, actual_selling_price, cost_price,
      mobile_models!model_id ( name, mobile_brands!brand_id ( name ) )
    `)
    .or(`imei1.eq.${searchImei},imei2.eq.${searchImei}`)
    .limit(1)

  if (!data || data.length === 0) return null
  const d     = data[0] as Record<string, unknown>
  const model = d['mobile_models'] as Record<string, unknown> | null
  const brand = model?.['mobile_brands'] as Record<string, unknown> | null
  return {
    id:            String(d['id']),
    imei1:         String(d['imei1']),
    imei2:         d['imei2'] as string | null,
    brand_name:    String(brand?.['name'] ?? '—'),
    model_name:    String(model?.['name'] ?? '—'),
    color:         d['color'] as string | null,
    storage:       d['storage'] as string | null,
    condition:     String(d['condition'] ?? 'used'),
    battery_health: d['battery_health'] != null ? Number(d['battery_health']) : null,
    status:        String(d['status']),
    selling_price: Number(d['actual_selling_price'] || d['selling_price'] || 0),
    cost_price:    Number(d['cost_price'] || 0),
  }
}

// ── Battery bar ───────────────────────────────────────────────────────────────

function BatteryBar({ pct }: { pct: number }) {
  const color = pct >= 80 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444'
  const segments = [25, 50, 75, 100]
  return (
    <div className="flex items-center gap-2">
      {/* Icon */}
      <svg width="28" height="14" viewBox="0 0 28 14" fill="none">
        <rect x="0.5" y="0.5" width="24" height="13" rx="2.5" stroke="currentColor" strokeOpacity="0.3" className="text-gray-400 dark:text-gray-600" />
        <rect x="1.5" y="1.5" width={Math.round(22 * pct / 100)} height="11" rx="1.5" fill={color} />
        <rect x="25" y="4" width="3" height="6" rx="1" fill="currentColor" className="text-gray-300 dark:text-gray-600" />
      </svg>
      {/* Segments */}
      <div className="flex gap-0.5 items-center">
        {segments.map(s => (
          <div
            key={s}
            className="w-4 h-1.5 rounded-sm transition-all"
            style={{ background: pct >= s ? color : undefined }}
            data-empty={pct < s || undefined}
          />
        ))}
      </div>
      <span className="text-xs font-bold tabular-nums" style={{ color }}>{pct}%</span>
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  code:    string
  onClose: () => void
}

export function DeviceFlashCard({ code, onClose }: Props) {
  const [device,   setDevice]   = useState<DeviceInfo | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [progress, setProgress] = useState(100)
  const [visible,  setVisible]  = useState(false)
  const navigate = useNavigate()
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Mount animation
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10)
    return () => clearTimeout(t)
  }, [])

  // Fetch
  useEffect(() => {
    lookup(code).then(d => { setDevice(d); setLoading(false) })
  }, [code])

  // Auto-close countdown
  useEffect(() => {
    if (loading) return
    const start    = Date.now()
    const duration = 5000
    timerRef.current = setInterval(() => {
      const elapsed   = Date.now() - start
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100)
      setProgress(remaining)
      if (remaining === 0) { clearInterval(timerRef.current!); handleClose() }
    }, 50)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading])

  function handleClose() {
    setVisible(false)
    setTimeout(onClose, 200)
  }

  const st  = device ? (STATUS_CONFIG[device.status] ?? STATUS_CONFIG['in_stock']) : null
  const Icon = st?.icon ?? null

  return (
    <div
      className="fixed inset-0 z-[9999] pointer-events-none flex items-start justify-center pt-5 px-4"
    >
      <div
        className="pointer-events-auto w-full max-w-sm transition-all duration-200 ease-out"
        style={{
          opacity:   visible ? 1 : 0,
          transform: visible ? 'translateY(0) scale(1)' : 'translateY(-12px) scale(0.96)',
        }}
      >
        {/* Card */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl shadow-black/10 dark:shadow-black/40 border border-gray-100 dark:border-gray-800 overflow-hidden">

          {/* Progress strip */}
          <div className="h-0.5 bg-gray-100 dark:bg-gray-800">
            <div
              className="h-full bg-blue-500 transition-none"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center gap-3 py-10">
              <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-gray-400 dark:text-gray-500 font-mono">{code.slice(0, 15)}…</p>
            </div>
          )}

          {/* Not found */}
          {!loading && !device && (
            <div className="p-5">
              <div className="flex items-start justify-between mb-4">
                <p className="text-xs text-gray-400 dark:text-gray-500 font-mono truncate flex-1 ml-2">{code}</p>
                <button onClick={handleClose} className="w-6 h-6 rounded-full flex items-center justify-center text-gray-300 hover:text-gray-500 dark:text-gray-600 dark:hover:text-gray-400 transition-colors flex-shrink-0">
                  <X size={14} />
                </button>
              </div>
              <div className="flex flex-col items-center justify-center gap-2 py-4">
                <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                  <AlertCircle size={22} className="text-red-400" />
                </div>
                <p className="text-sm font-bold text-gray-800 dark:text-gray-200">مش موجود في النظام</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 font-mono">{code}</p>
              </div>
            </div>
          )}

          {/* Device found */}
          {!loading && device && (
            <div className="p-4">

              {/* Top row: IMEI + close */}
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-mono text-gray-400 dark:text-gray-500 tabular-nums tracking-wide">
                  {device.imei1}
                </p>
                <button
                  onClick={handleClose}
                  className="w-6 h-6 rounded-full flex items-center justify-center text-gray-300 hover:text-gray-500 dark:text-gray-600 dark:hover:text-gray-400 transition-colors"
                >
                  <X size={13} />
                </button>
              </div>

              {/* Main content */}
              <div className="flex items-start gap-3">

                {/* Phone icon block */}
                <div className="w-11 h-11 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0 shadow-md shadow-blue-600/30">
                  <svg width="18" height="22" viewBox="0 0 18 22" fill="none">
                    <rect x="1" y="1" width="16" height="20" rx="3" stroke="white" strokeWidth="1.5"/>
                    <rect x="6" y="17.5" width="6" height="1.5" rx="0.75" fill="white" fillOpacity="0.6"/>
                    <rect x="6.5" y="0.5" width="5" height="1" rx="0.5" fill="white" fillOpacity="0.4"/>
                  </svg>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-base font-black text-gray-900 dark:text-white leading-tight">
                    {device.brand_name} {device.model_name}
                  </p>

                  {/* Tags row */}
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    {device.storage && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                        {device.storage}
                      </span>
                    )}
                    {device.color && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                        {device.color}
                      </span>
                    )}
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                      {CONDITION_AR[device.condition] ?? device.condition}
                    </span>
                  </div>
                </div>

                {/* Price */}
                <div className="flex-shrink-0 text-left">
                  <p className="text-xl font-black text-blue-600 dark:text-blue-400 tabular-nums leading-tight">
                    {fmt(device.selling_price)}
                  </p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 text-left">جنيه</p>
                </div>
              </div>

              {/* Divider */}
              <div className="my-3 border-t border-gray-100 dark:border-gray-800" />

              {/* Status + Battery row */}
              <div className="flex items-center justify-between gap-3">

                {/* Status badge */}
                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${st!.bg} ${st!.text}`}>
                  {Icon ? <Icon size={11} /> : (
                    <span className={`w-1.5 h-1.5 rounded-full ${st!.dot}`} />
                  )}
                  {st!.label}
                </div>

                {/* Battery */}
                {device.battery_health != null && (
                  <BatteryBar pct={device.battery_health} />
                )}
              </div>

              {/* IMEI2 if exists */}
              {device.imei2 && (
                <p className="mt-2 text-[10px] font-mono text-gray-300 dark:text-gray-600 tabular-nums tracking-wide">
                  IMEI 2: {device.imei2}
                </p>
              )}

              {/* CTA */}
              {device.status === 'in_stock' && (
                <button
                  onClick={() => { handleClose(); navigate('/pos') }}
                  className="mt-3 w-full h-10 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-600/25"
                >
                  <ShoppingCart size={15} />
                  بيع دلوقتي
                </button>
              )}

            </div>
          )}

          {/* Bottom timer bar */}
          {!loading && (
            <div className="flex items-center gap-2 px-4 pb-3">
              <div className="flex-1 h-0.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-200 dark:bg-blue-900 transition-none"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-[9px] text-gray-300 dark:text-gray-600 tabular-nums w-5 text-left">
                {Math.ceil(progress / 20)}s
              </span>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
