// src/pages/stock-reconcile/ModelCountTab.tsx
import { useMemo, useState } from 'react'
import { Check, Download, Printer, Search, ShoppingCart, Trash2, Undo2 } from 'lucide-react'
import { BarcodeLabelModal, type BarcodeLabel } from '@/components/shared/BarcodeLabelModal'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { DEVICE_STATUS_MAP } from '@/constants/statusMaps'
import { useSellFromReconcile } from '@/hooks/useSellFromReconcile'
import { readJson, writeJson } from '@/lib/clientStorage'
import { exportToExcel, type ExportHeader } from '@/lib/exportUtils'
import { friendlyDbError } from '@/lib/errors'
import { cn } from '@/lib/cn'
import { normalizeCode, stockReconcileService } from '@/services/stockReconcile.service'
import type { ReconcileDevice, ScanOutcome } from '@/types/stockReconcile'
import { ScanPanel, type ScanFeedback } from './ScanPanel'

const SCANNED_KEY = 'stock-reconcile:model-scanned-ids'
const CLOSED_KEY  = 'stock-reconcile:model-closed'

// الـ IMEI دايماً 15 رقم — لو اتكتب كده في خانة البحث يبقى سكانر مش بحث
const IMEI_RE = /^\d{15}$/

type Filter = 'all' | 'matched' | 'pending' | 'missing'

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all',     label: 'كل الأجهزة' },
  { value: 'matched', label: 'مطابق'      },
  { value: 'pending', label: 'لسه'        },
  { value: 'missing', label: 'ناقص'       },
]

const EXPORT_HEADERS: ExportHeader[] = [
  { key: 'label',   label: 'الجهاز', type: 'text', width: 30 },
  { key: 'imei1',   label: 'IMEI 1', type: 'text', width: 18 },
  { key: 'imei2',   label: 'IMEI 2', type: 'text', width: 18 },
]

function loadScannedIds(): string[] {
  const saved = readJson<unknown>(SCANNED_KEY, [])
  return Array.isArray(saved) ? saved.filter((c): c is string => typeof c === 'string') : []
}

function loadClosed(): boolean {
  return readJson<unknown>(CLOSED_KEY, false) === true
}

function deviceLabel(d: ReconcileDevice): string {
  return [`${d.brand_name} ${d.model_name}`, d.storage, d.color].filter(Boolean).join(' · ')
}

function describeOutcome(o: ScanOutcome): ScanFeedback {
  switch (o.kind) {
    case 'counted':      return { tone: 'success', text: `✓ ${o.groupLabel} — مطابق (${o.total} من النوع ده)` }
    case 'duplicate':    return { tone: 'warning', text: 'الجهاز ده اتمسح قبل كده' }
    case 'out_of_scope': return { tone: 'warning', text: 'الموديل ده خارج الأنواع اللي اخترتها' }
    case 'other_status': return { tone: 'warning', text: `النظام مسجله «${o.device ? DEVICE_STATUS_MAP[o.device.status].label : '—'}» مش في المخزون` }
    case 'unknown':      return { tone: 'danger',  text: 'الكود ده مش موجود في النظام' }
  }
}

function summarizeOutcomes(outcomes: ScanOutcome[]): ScanFeedback {
  const n = (k: ScanOutcome['kind']) => outcomes.filter(o => o.kind === k).length
  const parts = [
    `اتطابق ${n('counted')}`,
    n('duplicate')    ? `مكرر ${n('duplicate')}`           : '',
    n('other_status') ? `مش في المخزون ${n('other_status')}` : '',
    n('out_of_scope') ? `خارج النطاق ${n('out_of_scope')}`  : '',
    n('unknown')      ? `مش معروف ${n('unknown')}`          : '',
  ].filter(Boolean)
  return { tone: n('unknown') + n('other_status') > 0 ? 'warning' : 'info', text: parts.join(' · ') }
}

type RowState = 'matched' | 'pending' | 'missing'

function rowState(matched: boolean, closed: boolean): RowState {
  if (matched) return 'matched'
  return closed ? 'missing' : 'pending'
}

function StateBadge({ state }: { state: RowState }) {
  if (state === 'matched') return <Badge variant="success">مطابق</Badge>
  if (state === 'missing') return <Badge variant="danger">ناقص</Badge>
  return <Badge variant="neutral">لسه</Badge>
}

interface Props {
  devices:   ReconcileDevice[]
  isLoading: boolean
  isError:   boolean
  error:     unknown
  scope:     string[]   // الموديلات المحددة (فاضي = الكل)
}

export function ModelCountTab({ devices, isLoading, isError, error, scope }: Props) {
  const [search,  setSearch]  = useState('')
  const [filter,  setFilter]  = useState<Filter>('all')
  const [confirm, setConfirm] = useState<'close' | 'clear' | null>(null)
  const [scannedIds, setScannedIds] = useState<string[]>(loadScannedIds)
  const [closed,  setClosed]  = useState<boolean>(loadClosed)
  const [feedback, setFeedback] = useState<ScanFeedback | null>(null)
  const [label, setLabel] = useState<BarcodeLabel | null>(null)
  const onSell = useSellFromReconcile()

  const matchedIds = useMemo(() => new Set(scannedIds), [scannedIds])
  const inStock    = useMemo(() => stockReconcileService.listInStock(devices, scope), [devices, scope])

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return inStock.filter(d => {
      const state = rowState(matchedIds.has(d.id), closed)
      if (filter !== 'all' && state !== filter) return false
      return !q || deviceLabel(d).toLowerCase().includes(q) || d.imei1.includes(q) || (d.imei2 ?? '').includes(q)
    })
  }, [inStock, matchedIds, closed, search, filter])

  const matchedTotal = inStock.filter(d => matchedIds.has(d.id)).length
  const restTotal    = inStock.length - matchedTotal

  function persistIds(next: string[]) {
    setScannedIds(next)
    writeJson(SCANNED_KEY, next)
  }

  function persistClosed(next: boolean) {
    setClosed(next)
    writeJson(CLOSED_KEY, next)
  }

  // مسح جهاز/أجهزة: كل جهاز بيتعلّم «مطابق»
  function handleScan(codes: string[]) {
    const result = stockReconcileService.applyScans(devices, scope, scannedIds, codes)
    persistIds(result.scannedIds)
    setFeedback(result.outcomes.length === 1 ? describeOutcome(result.outcomes[0]) : summarizeOutcomes(result.outcomes))
  }

  // لو سكانر كتب الـ IMEI في خانة البحث بالغلط — اعتبره مسح مش بحث
  function handleSearchChange(value: string) {
    const code = normalizeCode(value)
    if (IMEI_RE.test(code)) { handleScan([code]); setSearch(''); return }
    setSearch(value)
  }

  // تأكيد يدوي لجهاز موجود عندك (أو إلغاؤه)
  function toggleMatched(id: string) {
    persistIds(matchedIds.has(id) ? scannedIds.filter(x => x !== id) : [...scannedIds, id])
  }

  function clearAll() {
    persistIds([])
    persistClosed(false)
    setFeedback(null)
    setConfirm(null)
  }

  function printDeviceLabel(d: ReconcileDevice) {
    setLabel({
      type:    'device',
      code:    d.imei1,
      name:    `${d.brand_name} ${d.model_name}`,
      subName: [d.storage, d.color].filter(Boolean).join(' · ') || undefined,
      extra:   `IMEI: ${d.imei1}`,
      price:   d.selling_price ?? undefined,
      battery: d.battery_health,
    })
  }

  function exportMissing() {
    exportToExcel('الأجهزة-الناقصة', EXPORT_HEADERS,
      inStock.filter(d => !matchedIds.has(d.id)).map(d => ({
        label: deviceLabel(d), imei1: d.imei1, imei2: d.imei2 ?? '',
      })))
  }

  const kpis = [
    { label: 'أجهزة في النظام',    value: inStock.length,                color: 'text-blue-600 dark:text-blue-400' },
    { label: 'مطابق',              value: matchedTotal,                  color: 'text-green-600 dark:text-green-400' },
    { label: 'لسه',                value: closed ? 0 : restTotal,        color: 'text-gray-900 dark:text-white' },
    { label: 'ناقص (اتباع؟)',      value: closed ? restTotal : 0,        color: 'text-red-600 dark:text-red-400' },
  ]

  if (isError) return <p className="text-sm text-red-600 dark:text-red-400">{friendlyDbError(error)}</p>

  return (
    <div className="space-y-5">
      <ScanPanel scannedCount={scannedIds.length} feedback={feedback} disabled={isLoading}
        onAdd={handleScan} onClear={() => setConfirm('clear')} />

      <Card>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          كل جهاز ليه سطر لوحده. لما تمسح الـ IMEI بتاعه بيبقى «مطابق»، وتقدر تأكده بإيدك بزرار «مطابق».
          الجهاز اللي مامسحتوش بيفضل «لسه»، ولما تخلّص دوس «اللي لسه = ناقص».
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
          <input type="text" value={search} onChange={e => handleSearchChange(e.target.value)} placeholder="ابحث بالموديل أو اللون أو IMEI..."
            className="w-full h-9 pr-8 pl-3 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-blue-500" />
        </div>
        <select value={filter} onChange={e => setFilter(e.target.value as Filter)}
          className="h-9 border border-gray-200 dark:border-gray-700 rounded-lg px-3 text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:border-blue-500">
          {FILTERS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
        <Button size="sm" variant="secondary" disabled={closed || restTotal === 0} onClick={() => setConfirm('close')}>
          اللي لسه = ناقص
        </Button>
        <Button size="sm" variant="secondary" icon={<Download size={14} />} disabled={!closed || restTotal === 0} onClick={exportMissing}>
          تصدير الناقص
        </Button>
        <Button size="sm" variant="ghost" icon={<Trash2 size={14} />} disabled={scannedIds.length === 0 && !closed} onClick={() => setConfirm('clear')}>
          مسح العد
        </Button>
      </div>

      <Card padding={false}>
        {isLoading ? (
          <p className="px-4 py-10 text-center text-sm text-gray-400">جاري التحميل...</p>
        ) : visible.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-gray-400">مفيش أجهزة مطابقة</p>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {visible.map(d => {
              const matched = matchedIds.has(d.id)
              return (
                <li key={d.id} className="px-4 py-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{deviceLabel(d)}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-mono">{d.imei1}</p>
                      {d.battery_health != null && (
                        <p className={cn('text-xs font-semibold mt-0.5',
                          d.battery_health >= 80 ? 'text-green-600 dark:text-green-400'
                          : d.battery_health >= 50 ? 'text-amber-600 dark:text-amber-400'
                          : 'text-red-600 dark:text-red-400')}>
                          بطارية {d.battery_health}%
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 justify-between sm:justify-end">
                      <StateBadge state={rowState(matched, closed)} />
                      <Button size="sm" variant="secondary"
                        icon={matched ? <Undo2 size={14} /> : <Check size={14} />}
                        onClick={() => toggleMatched(d.id)}>
                        {matched ? 'إلغاء' : 'مطابق'}
                      </Button>
                      {matched && (
                        <Button size="sm" variant="secondary" icon={<Printer size={14} />} onClick={() => printDeviceLabel(d)}>
                          طباعة ليبل
                        </Button>
                      )}
                      {!matched && onSell && (
                        <Button size="sm" variant="primary" icon={<ShoppingCart size={14} />} onClick={() => onSell(d)}>
                          بيع
                        </Button>
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      {label && <BarcodeLabelModal label={label} onClose={() => setLabel(null)} />}

      {confirm === 'close' && (
        <ConfirmModal variant="warning" title="اعتبار الباقي ناقص"
          message="كل جهاز لسه ماتطابقش هيتحسب إنه مش موجود عندك، وهيظهر ناقص. متأكد؟"
          confirmText="أيوه، ناقص" onConfirm={() => { persistClosed(true); setConfirm(null) }} onCancel={() => setConfirm(null)} />
      )}
      {confirm === 'clear' && (
        <ConfirmModal title="مسح العد" message="هتمسح كل الأجهزة اللي اتطابقت وتبدأ من الأول. متأكد؟"
          confirmText="امسح" onConfirm={clearAll} onCancel={() => setConfirm(null)} />
      )}
    </div>
  )
}
