// src/pages/devices/ImeiLookup.tsx
import { useState } from 'react'
import { Search, ScanLine, X } from 'lucide-react'
import { devicesService } from '@/services/devices.service'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/cn'
import { STATUS_MAP } from './constants'
import type { MobileDeviceView } from '@/types/database'

export function ImeiLookup() {
  const [imei, setImei]     = useState('')
  const [result, setResult] = useState<{ found: boolean; device: MobileDeviceView | null } | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSearch() {
    if (!imei.trim()) return
    setLoading(true)
    setResult(null)
    try {
      const res = await devicesService.lookupByImei(imei)
      setResult(res)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <ScanLine size={16} className="text-blue-600 dark:text-blue-400" />
        <span className="text-sm font-semibold text-gray-900 dark:text-white">بحث بـ IMEI</span>
      </div>
      <div className="flex gap-2">
        <input
          value={imei}
          onChange={e => setImei(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && void handleSearch()}
          placeholder="أدخل رقم IMEI للبحث..."
          dir="ltr"
          className="flex-1 h-9 px-3 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all font-mono"
        />
        <button
          onClick={() => void handleSearch()}
          disabled={loading || !imei.trim()}
          className="h-9 px-4 text-sm font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {loading
            ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            : <Search size={14} />}
          بحث
        </button>
        {(imei || result) && (
          <button onClick={() => { setImei(''); setResult(null) }}
            className="h-9 w-9 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
            <X size={14} />
          </button>
        )}
      </div>

      {result && (
        <div className={cn(
          'mt-3 rounded-lg border p-3',
          result.found
            ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800'
            : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800',
        )}>
          {result.found && result.device ? (
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 dark:text-white">
                  {result.device.brand_name} {result.device.model_name}
                </p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">IMEI: {result.device.imei1}</span>
                  {result.device.color    && <span className="text-xs text-gray-500 dark:text-gray-400">اللون: {result.device.color}</span>}
                  {result.device.storage  && <span className="text-xs text-gray-500 dark:text-gray-400">السعة: {result.device.storage}</span>}
                  <span className="text-xs text-gray-500 dark:text-gray-400">المورد: {result.device.supplier_name}</span>
                </div>
              </div>
              <Badge variant={STATUS_MAP[result.device.status].variant} dot>
                {STATUS_MAP[result.device.status].label}
              </Badge>
            </div>
          ) : (
            <p className="text-sm text-red-700 dark:text-red-400 font-medium">
              لم يتم العثور على جهاز بهذا الـ IMEI
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Device Form ───────────────────────────────────────────────────────────────

interface FormState {
  imei1: string; imei2: string; serial_number: string
  brand_id: string; model_id: string
  storage: string; color: string; condition: string
  supplier_id: string; purchase_date: string
  cost_price: string; selling_price: string
  warranty_months: string; location: string; notes: string
}
