// src/components/shared/DeviceFlashCard.tsx
// بطاقة سريعة تظهر لما تسكن IMEI — تختفي تلقائي بعد 4 ثواني
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, ShoppingCart, CheckCircle, AlertCircle, Clock } from 'lucide-react'
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
  battery_health: number | null
  status:         string
  selling_price:  number
  cost_price:     number
}

const STATUS_LABEL: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  in_stock:  { label: 'متاح',   color: 'text-green-600',  icon: CheckCircle },
  sold:      { label: 'مباع',   color: 'text-red-500',    icon: AlertCircle },
  defective: { label: 'تالف',   color: 'text-orange-500', icon: AlertCircle },
}

async function lookup(code: string): Promise<DeviceInfo | null> {
  const searchImei = code.includes('/') ? code.split('/')[0].trim() : code.trim()
  const { data } = await supabase
    .from('mobile_devices')
    .select(`
      id, imei1, imei2, color, storage, battery_health, status, selling_price, actual_selling_price, cost_price,
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
    color:          d['color'] as string | null,
    storage:        d['storage'] as string | null,
    battery_health: d['battery_health'] != null ? Number(d['battery_health']) : null,
    status:         String(d['status']),
    selling_price: Number(d['actual_selling_price'] || d['selling_price'] || 0),
    cost_price:    Number(d['cost_price'] || 0),
  }
}

interface Props {
  code:    string
  onClose: () => void
}

export function DeviceFlashCard({ code, onClose }: Props) {
  const [device,  setDevice]  = useState<DeviceInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState(100)
  const navigate = useNavigate()

  useEffect(() => {
    lookup(code).then(d => { setDevice(d); setLoading(false) })
  }, [code])

  // Auto-close after 5s with progress bar
  useEffect(() => {
    if (loading) return
    const start = Date.now()
    const duration = 5000
    const tick = setInterval(() => {
      const elapsed = Date.now() - start
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100)
      setProgress(remaining)
      if (remaining === 0) { clearInterval(tick); onClose() }
    }, 50)
    return () => clearInterval(tick)
  }, [loading, onClose])

  const st = device ? (STATUS_LABEL[device.status] ?? STATUS_LABEL['in_stock']) : null
  const Icon = st?.icon ?? CheckCircle

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] w-[min(380px,calc(100vw-2rem))] animate-in slide-in-from-top-4 duration-300">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">

        {/* Progress bar */}
        <div className="h-1 bg-gray-100 dark:bg-gray-800">
          <div
            className="h-full bg-blue-500 transition-all duration-75 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-gray-400 dark:text-gray-500 font-mono">{code.slice(0, 20)}{code.length > 20 ? '...' : ''}</span>
            <button onClick={onClose} className="w-6 h-6 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <X size={14} />
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-6">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !device ? (
            <div className="text-center py-4">
              <AlertCircle size={28} className="mx-auto text-red-400 mb-2" />
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">مش موجود في النظام</p>
              <p className="text-xs text-gray-400 mt-1 font-mono">{code}</p>
            </div>
          ) : (
            <>
              {/* Device Info */}
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-lg">📱</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 dark:text-white text-base leading-tight">
                    {device.brand_name} {device.model_name}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {device.storage && <span className="text-xs text-gray-500 dark:text-gray-400">{device.storage}</span>}
                    {device.color   && <span className="text-xs text-gray-500 dark:text-gray-400">· {device.color}</span>}
                    <span className={`text-xs font-semibold flex items-center gap-1 ${st?.color}`}>
                      <Icon size={11} /> {st?.label}
                    </span>
                  </div>
                  {device.battery_health != null && (
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            device.battery_health >= 80 ? 'bg-green-500' :
                            device.battery_health >= 50 ? 'bg-amber-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${device.battery_health}%` }}
                        />
                      </div>
                      <span className={`text-xs font-bold tabular-nums ${
                        device.battery_health >= 80 ? 'text-green-600 dark:text-green-400' :
                        device.battery_health >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'
                      }`}>
                        🔋 {device.battery_health}%
                      </span>
                    </div>
                  )}
                  <p className="text-xs text-gray-400 dark:text-gray-500 font-mono mt-1">{device.imei1}</p>
                </div>
                <div className="text-left flex-shrink-0">
                  <p className="text-lg font-black text-blue-600 dark:text-blue-400">{fmt(device.selling_price)}</p>
                  <p className="text-xs text-gray-400">ج</p>
                </div>
              </div>

              {/* Action */}
              {device.status === 'in_stock' && (
                <button
                  onClick={() => { onClose(); navigate('/pos') }}
                  className="mt-3 w-full h-9 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors"
                >
                  <ShoppingCart size={15} /> بيع دلوقتي
                </button>
              )}
            </>
          )}
        </div>

        {/* Timer indicator */}
        {!loading && (
          <div className="px-4 pb-3 flex items-center gap-1.5 text-gray-400">
            <Clock size={11} />
            <span className="text-[10px]">بيختفي تلقائي</span>
          </div>
        )}
      </div>
    </div>
  )
}
