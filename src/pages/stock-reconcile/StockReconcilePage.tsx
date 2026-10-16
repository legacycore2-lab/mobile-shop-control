// src/pages/stock-reconcile/StockReconcilePage.tsx
import { useMemo, useState } from 'react'
import { useReconcileDevices } from '@/hooks/useStockReconcile'
import { readJson, writeJson } from '@/lib/clientStorage'
import { cn } from '@/lib/cn'
import { stockReconcileService } from '@/services/stockReconcile.service'
import { ImeiScanTab } from './ImeiScanTab'
import { ModelCountTab } from './ModelCountTab'
import { ScopePicker } from './ScopePicker'

const SCOPE_KEY = 'stock-reconcile:scope'

function loadScope(): string[] {
  const saved = readJson<unknown>(SCOPE_KEY, [])
  return Array.isArray(saved) ? saved.filter((k): k is string => typeof k === 'string') : []
}

type Mode = 'model' | 'imei'

const MODES: { id: Mode; label: string; hint: string }[] = [
  { id: 'model', label: 'عد بالموديل', hint: 'بتحط العدد الموجود فعلاً لكل نوع'   },
  { id: 'imei',  label: 'مسح IMEI',    hint: 'بتمسح كل جهاز بالسكانر'            },
]

export function StockReconcilePage() {
  const { data: devices = [], isLoading, isError, error } = useReconcileDevices()
  const [mode,  setMode]  = useState<Mode>('model')
  const [scope, setScope] = useState<string[]>(loadScope)

  const models = useMemo(() => stockReconcileService.listModels(devices), [devices])
  // الموديلات اللي اتحذفت من المخزون (اتباعت كلها) مبتأثرش على النطاق
  const activeScope = useMemo(() => scope.filter(k => models.some(m => m.key === k)), [scope, models])
  const scopedDevices = useMemo(() => stockReconcileService.filterByScope(devices, activeScope), [devices, activeScope])

  function handleScopeChange(next: string[]) {
    setScope(next)
    writeJson(SCOPE_KEY, next)
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">مطابقة المخزون</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          اعرف أي موبايلات النظام شايفها في المخزون وهي مش موجودة فعلاً (اتباعت من غير تسجيل)
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 max-w-md">
        {MODES.map(m => (
          <button key={m.id} type="button" onClick={() => setMode(m.id)} aria-pressed={mode === m.id}
            className={cn(
              'rounded-xl border px-4 py-2.5 text-start transition-colors',
              mode === m.id
                ? 'bg-blue-600 border-blue-600 text-white'
                : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300',
            )}>
            <span className="block text-sm font-semibold">{m.label}</span>
            <span className={cn('block text-xs mt-0.5', mode === m.id ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400')}>{m.hint}</span>
          </button>
        ))}
      </div>

      {!isLoading && !isError && (
        <ScopePicker models={models} selected={activeScope} onChange={handleScopeChange} />
      )}

      {mode === 'model'
        ? <ModelCountTab devices={scopedDevices} isLoading={isLoading} isError={isError} error={error} />
        : <ImeiScanTab   devices={devices} isLoading={isLoading} isError={isError} error={error} scope={activeScope} />}
    </div>
  )
}
