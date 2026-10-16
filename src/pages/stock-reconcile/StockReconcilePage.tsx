// src/pages/stock-reconcile/StockReconcilePage.tsx
import { useMemo, useState } from 'react'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { useReconcileDevices } from '@/hooks/useStockReconcile'
import { useNumberVisibility } from '@/hooks/usePermissions'
import { readJson, writeJson } from '@/lib/clientStorage'
import { exportToCsv, type ExportHeader } from '@/lib/exportUtils'
import { friendlyDbError } from '@/lib/errors'
import { cn } from '@/lib/cn'
import { stockReconcileService } from '@/services/stockReconcile.service'
import type { ReconcileDevice } from '@/types/stockReconcile'
import { DeviceTable } from './DeviceTable'
import { ResultSection } from './ResultSection'
import { ScanPanel, type ScanFeedback } from './ScanPanel'

const STORAGE_KEY = 'stock-reconcile:codes'

function loadCodes(): string[] {
  const saved = readJson<unknown>(STORAGE_KEY, [])
  return Array.isArray(saved) ? saved.filter((c): c is string => typeof c === 'string') : []
}

const MISSING_HEADERS: ExportHeader[] = [
  { key: 'device',        label: 'الجهاز' },
  { key: 'imei1',         label: 'IMEI 1' },
  { key: 'imei2',         label: 'IMEI 2' },
  { key: 'storage',       label: 'التخزين' },
  { key: 'color',         label: 'اللون' },
  { key: 'cost_price',    label: 'سعر الشراء', type: 'currency' },
  { key: 'selling_price', label: 'سعر البيع',  type: 'currency' },
  { key: 'purchase_date', label: 'تاريخ الشراء', type: 'date' },
]

export function StockReconcilePage() {
  const { data: devices = [], isLoading, isError, error } = useReconcileDevices()
  const vis = useNumberVisibility()

  const [codes,    setCodes]    = useState<string[]>(loadCodes)
  const [feedback, setFeedback] = useState<ScanFeedback | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)

  const result = useMemo(() => stockReconcileService.reconcile(devices, codes), [devices, codes])
  const inStockCount = result.matched.length + result.missing.length

  function persist(next: string[]) {
    setCodes(next)
    writeJson(STORAGE_KEY, next)
  }

  function handleAdd(incoming: string[]) {
    const known = new Set(codes)
    const fresh = incoming.filter(c => !known.has(c))

    if (incoming.length === 1) {
      const code = incoming[0]
      if (!fresh.length) {
        setFeedback({ tone: 'warning', text: 'الكود ده اتمسح قبل كده' })
        return
      }
      const { kind, device } = stockReconcileService.lookup(devices, code)
      if (kind === 'matched' && device) setFeedback({ tone: 'success', text: `✓ ${device.brand_name} ${device.model_name}` })
      else if (kind === 'other_status') setFeedback({ tone: 'warning', text: 'موجود في النظام بس مش "في المخزون"' })
      else setFeedback({ tone: 'danger', text: 'الكود ده مش موجود في النظام' })
    } else {
      setFeedback({ tone: 'info', text: `اتضاف ${fresh.length} كود${incoming.length > fresh.length ? ` (${incoming.length - fresh.length} مكرر)` : ''}` })
    }
    if (fresh.length) persist([...codes, ...fresh])
  }

  function handleClear() {
    persist([])
    setFeedback(null)
    setConfirmClear(false)
  }

  function exportMissing() {
    exportToCsv('الأجهزة-الناقصة', MISSING_HEADERS, result.missing.map((d: ReconcileDevice) => ({
      ...d, device: `${d.brand_name} ${d.model_name}`,
      cost_price: vis.cost ? d.cost_price : '',
    })))
  }

  const kpis = [
    { label: 'مسجلة في المخزون',     value: inStockCount,              color: 'text-blue-600 dark:text-blue-400' },
    { label: 'اتمسحت (موجودة)',      value: result.matched.length,     color: 'text-green-600 dark:text-green-400' },
    { label: 'ناقصة (مش اتمسحت)',    value: result.missing.length,     color: 'text-red-600 dark:text-red-400' },
    { label: 'حالة تانية / مش معروفة', value: result.otherStatus.length + result.unknown.length, color: 'text-amber-600 dark:text-amber-400' },
  ]

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">مطابقة المخزون</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          اعرف أي موبايلات النظام شايفها في المخزون وهي مش موجودة فعلاً (اتباعت من غير تسجيل)
        </p>
      </div>

      <ScanPanel scannedCount={codes.length} feedback={feedback} disabled={isLoading || isError}
        onAdd={handleAdd} onClear={() => setConfirmClear(true)} />

      {isError && <p className="text-sm text-red-600 dark:text-red-400">{friendlyDbError(error)}</p>}

      {!isLoading && !isError && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {kpis.map(k => (
            <div key={k.label} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{k.label}</p>
              <p className={cn('text-2xl font-bold', k.color)}>{k.value}</p>
            </div>
          ))}
        </div>
      )}

      {codes.length > 0 && !isLoading && !isError && (
        <>
          <ResultSection
            title="ناقصة — مسجلة في المخزون ومش اتمسحت"
            description="دي الأجهزة اللي النظام شايفها عندك، ولو مسحت كل اللي موجود فعلاً يبقى غالباً اتباعت وماتسجلتش"
            count={result.missing.length}
            actions={
              <Button size="sm" variant="secondary" icon={<Download size={14} />}
                disabled={result.missing.length === 0} onClick={exportMissing}>
                تصدير CSV
              </Button>
            }
          >
            {result.missing.length === 0
              ? <p className="px-4 pb-4 text-sm text-green-600 dark:text-green-400">كل أجهزة المخزون اتمسحت — مفيش ناقص</p>
              : <DeviceTable devices={result.missing} showCost={vis.cost} />}
          </ResultSection>

          {result.otherStatus.length > 0 && (
            <ResultSection
              title="اتمسحت بس حالتها في النظام مش «في المخزون»"
              description="الأجهزة دي موجودة عندك فعلاً لكن النظام مسجلها بحالة تانية (مباع مثلاً) — راجع حالتها"
              count={result.otherStatus.length}
            >
              <DeviceTable devices={result.otherStatus} showStatus showCost={vis.cost} />
            </ResultSection>
          )}

          {result.unknown.length > 0 && (
            <ResultSection
              title="أكواد مش موجودة في النظام"
              description="الأكواد دي اتمسحت بس مفيش جهاز بنفس الـ IMEI في النظام — راجع الكود أو سجّل الجهاز في المشتريات"
              count={result.unknown.length}
            >
              <div className="px-4 pb-4 flex flex-wrap gap-2">
                {result.unknown.map(c => (
                  <span key={c} className="px-2.5 py-1 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 font-mono text-xs">{c}</span>
                ))}
              </div>
            </ResultSection>
          )}
        </>
      )}

      {confirmClear && (
        <ConfirmModal
          title="مسح كل الأكواد"
          message="هتمسح كل الأكواد اللي اتمسحت لحد دلوقتي وتبدأ من الأول. متأكد؟"
          confirmText="امسح الكل"
          onConfirm={handleClear}
          onCancel={() => setConfirmClear(false)}
        />
      )}
    </div>
  )
}
