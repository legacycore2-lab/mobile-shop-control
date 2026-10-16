// src/pages/stock-reconcile/ModelCountTab.tsx
import { useMemo, useState } from 'react'
import { Download, Search, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { readJson, writeJson } from '@/lib/clientStorage'
import { exportToCsv, type ExportHeader } from '@/lib/exportUtils'
import { friendlyDbError } from '@/lib/errors'
import { cn } from '@/lib/cn'
import { stockReconcileService } from '@/services/stockReconcile.service'
import type { ModelCountRow, ReconcileDevice } from '@/types/stockReconcile'
import { CountStepper } from './CountStepper'

const STORAGE_KEY = 'stock-reconcile:model-counts'

type Filter = 'all' | 'missing' | 'extra' | 'pending'

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all',     label: 'كل الأنواع'    },
  { value: 'missing', label: 'ناقص'          },
  { value: 'extra',   label: 'زيادة'         },
  { value: 'pending', label: 'لسه معدّش'    },
]

const EXPORT_HEADERS: ExportHeader[] = [
  { key: 'label',   label: 'النوع' },
  { key: 'system',  label: 'في النظام', type: 'number' },
  { key: 'counted', label: 'الفعلي',    type: 'number' },
  { key: 'missing', label: 'الناقص',    type: 'number' },
]

function loadCounts(): Record<string, number> {
  const saved = readJson<unknown>(STORAGE_KEY, {})
  if (typeof saved !== 'object' || saved === null || Array.isArray(saved)) return {}
  return Object.fromEntries(
    Object.entries(saved).filter((e): e is [string, number] => typeof e[1] === 'number'),
  )
}

function matchesFilter(row: ModelCountRow, filter: Filter): boolean {
  if (filter === 'missing') return row.diff !== null && row.diff < 0
  if (filter === 'extra')   return row.diff !== null && row.diff > 0
  if (filter === 'pending') return row.counted === null
  return true
}

function DiffBadge({ row }: { row: ModelCountRow }) {
  if (row.diff === null) return <Badge variant="neutral">لسه</Badge>
  if (row.diff === 0)    return <Badge variant="success">مطابق</Badge>
  if (row.diff < 0)      return <Badge variant="danger">ناقص {Math.abs(row.diff)}</Badge>
  return <Badge variant="warning">زيادة {row.diff}</Badge>
}

interface Props {
  devices:   ReconcileDevice[]
  isLoading: boolean
  isError:   boolean
  error:     unknown
}

export function ModelCountTab({ devices, isLoading, isError, error }: Props) {
  const [counts,  setCounts]  = useState<Record<string, number>>(loadCounts)
  const [search,  setSearch]  = useState('')
  const [filter,  setFilter]  = useState<Filter>('all')
  const [confirm, setConfirm] = useState<'zero' | 'clear' | null>(null)

  const rows = useMemo(
    () => stockReconcileService.buildCountRows(stockReconcileService.groupInStock(devices), counts),
    [devices, counts],
  )

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter(r => matchesFilter(r, filter) && (!q || r.label.toLowerCase().includes(q)))
  }, [rows, search, filter])

  const counted      = rows.filter(r => r.counted !== null)
  const missingTotal = counted.reduce((s, r) => s + Math.max(0, -(r.diff ?? 0)), 0)
  const extraTotal   = counted.reduce((s, r) => s + Math.max(0, r.diff ?? 0), 0)
  const systemTotal  = rows.reduce((s, r) => s + r.system_qty, 0)

  function persist(next: Record<string, number>) {
    setCounts(next)
    writeJson(STORAGE_KEY, next)
  }

  function setCount(key: string, value: number | null) {
    const next = { ...counts }
    if (value === null) delete next[key]
    else next[key] = value
    persist(next)
  }

  // اللي لسه معدّش يتحسب صفر (يعني مش موجود عندك)
  function zeroPending() {
    const next = { ...counts }
    for (const r of rows) if (r.counted === null) next[r.key] = 0
    persist(next)
    setConfirm(null)
  }

  function clearAll() {
    persist({})
    setConfirm(null)
  }

  function exportMissing() {
    exportToCsv('الأجهزة-الناقصة-بالموديل', EXPORT_HEADERS,
      rows.filter(r => r.diff !== null && r.diff < 0).map(r => ({
        label: r.label, system: r.system_qty, counted: r.counted, missing: -(r.diff ?? 0),
      })))
  }

  const kpis = [
    { label: 'أجهزة في النظام',   value: systemTotal,                      color: 'text-blue-600 dark:text-blue-400' },
    { label: 'أنواع اتعدّت',      value: `${counted.length}/${rows.length}`, color: 'text-gray-900 dark:text-white' },
    { label: 'ناقص (اتباع؟)',     value: missingTotal,                     color: 'text-red-600 dark:text-red-400' },
    { label: 'زيادة عن النظام',   value: extraTotal,                       color: 'text-amber-600 dark:text-amber-400' },
  ]

  if (isError) return <p className="text-sm text-red-600 dark:text-red-400">{friendlyDbError(error)}</p>

  return (
    <div className="space-y-5">
      <Card>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          لكل نوع، اكتب أو زوّد (+) عدد الأجهزة <span className="font-semibold">الموجودة قدامك فعلاً</span>.
          النوع اللي ماتعدّش بيفضل «لسه»، ولما تخلّص دوس «اللي ماتعدّش = صفر».
        </p>
      </Card>

      {!isLoading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {kpis.map(k => (
            <div key={k.label} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{k.label}</p>
              <p className={cn('text-2xl font-bold', k.color)}>{k.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحث بالموديل أو اللون..."
            className="w-full h-9 pr-8 pl-3 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-blue-500" />
        </div>
        <select value={filter} onChange={e => setFilter(e.target.value as Filter)}
          className="h-9 border border-gray-200 dark:border-gray-700 rounded-lg px-3 text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:border-blue-500">
          {FILTERS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
        <Button size="sm" variant="secondary" disabled={rows.every(r => r.counted !== null)} onClick={() => setConfirm('zero')}>
          اللي ماتعدّش = صفر
        </Button>
        <Button size="sm" variant="secondary" icon={<Download size={14} />} disabled={missingTotal === 0} onClick={exportMissing}>
          تصدير الناقص
        </Button>
        <Button size="sm" variant="ghost" icon={<Trash2 size={14} />} disabled={counted.length === 0} onClick={() => setConfirm('clear')}>
          مسح العد
        </Button>
      </div>

      <Card padding={false}>
        {isLoading ? (
          <p className="px-4 py-10 text-center text-sm text-gray-400">جاري التحميل...</p>
        ) : visible.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-gray-400">مفيش أنواع مطابقة</p>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {visible.map(r => (
              <li key={r.key} className="px-4 py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{r.label}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">في النظام: {r.system_qty} جهاز</p>
                </div>
                <div className="flex items-center gap-3 justify-between sm:justify-end">
                  <DiffBadge row={r} />
                  <CountStepper value={r.counted} label={r.label} onChange={v => setCount(r.key, v)} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {confirm === 'zero' && (
        <ConfirmModal variant="warning" title="اعتبار الباقي صفر"
          message="كل نوع ماتعدّش هيتحسب إن مفيش منه ولا جهاز عندك، وهيظهر ناقص بعدده كله. متأكد؟"
          confirmText="أيوه، صفر" onConfirm={zeroPending} onCancel={() => setConfirm(null)} />
      )}
      {confirm === 'clear' && (
        <ConfirmModal title="مسح العد" message="هتمسح كل الأعداد اللي دخلتها وتبدأ من الأول. متأكد؟"
          confirmText="امسح" onConfirm={clearAll} onCancel={() => setConfirm(null)} />
      )}
    </div>
  )
}
