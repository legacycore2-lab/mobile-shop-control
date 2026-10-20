// src/pages/reports/tabs/PriceListTab.tsx
// تقرير أسعار الأجهزة — سعر الشراء والبيع لكل جهاز على حدة
import { useState, useMemo } from 'react'
import { Search, Download, FileText } from 'lucide-react'
import { useDevicePriceList } from '@/hooks/useReports'
import { DEVICE_STATUS_MAP } from '@/constants/statusMaps'
import { Badge } from '@/components/ui/Badge'
import { fmt } from '@/lib/fmt'
import { exportPriceListPdf } from '@/lib/pdfExport'
import { exportToExcel, type ExportHeader } from '@/lib/exportUtils'
import { cn } from '@/lib/cn'

const STATUS_OPTIONS = [
  { value: '',               label: 'كل الحالات'   },
  { value: 'in_stock',       label: 'في المخزون'   },
  { value: 'sold',           label: 'مباع'          },
  { value: 'returned',       label: 'مُعاد'         },
  { value: 'defective',      label: 'تالف'          },
  { value: 'sent_to_repair', label: 'في الصيانة'   },
]

const SEL = 'h-9 border border-gray-200 dark:border-gray-700 rounded-lg px-3 text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:border-blue-500'

function batteryColor(pct: number): string {
  if (pct >= 80) return 'text-green-600 dark:text-green-400'
  if (pct >= 50) return 'text-amber-600 dark:text-amber-400'
  return 'text-red-600 dark:text-red-400'
}

const EXPORT_HEADERS: ExportHeader[] = [
  { key: 'index',          label: '#',          type: 'number',   width: 6  },
  { key: 'brand_name',     label: 'الماركة',    type: 'text',     width: 14 },
  { key: 'model_name',     label: 'الموديل',    type: 'text',     width: 18 },
  { key: 'imei1',          label: 'IMEI 1',     type: 'text',     width: 20 },
  { key: 'imei2',          label: 'IMEI 2',     type: 'text',     width: 20 },
  { key: 'storage',        label: 'التخزين',    type: 'text',     width: 11 },
  { key: 'color',          label: 'اللون',      type: 'text',     width: 16 },
  { key: 'battery_health', label: 'البطارية %', type: 'number',   width: 12 },
  { key: 'status_label',   label: 'الحالة',     type: 'text',     width: 12 },
  { key: 'cost_price',     label: 'سعر الشراء', type: 'currency', width: 14 },
  { key: 'selling_price',  label: 'سعر البيع',  type: 'currency', width: 14 },
  { key: 'profit',         label: 'الفرق',      type: 'currency', width: 14 },
  { key: 'margin_pct',     label: 'هامش %',     type: 'number',   width: 10 },
]

function exportPriceList(rows: ReturnType<typeof useDevicePriceList>['data']) {
  if (!rows?.length) return
  exportToExcel('device-price-list', EXPORT_HEADERS, rows.map((r, i) => ({
    ...r,
    index:        i + 1,
    status_label: DEVICE_STATUS_MAP[r.status as keyof typeof DEVICE_STATUS_MAP]?.label ?? r.status,
    margin_pct:   Math.round(r.margin_pct * 10) / 10,
  })), 'أسعار الأجهزة')
}

export function PriceListTabContent() {
  const { data: devices = [], isLoading } = useDevicePriceList()

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [brand,  setBrand]  = useState('')
  const [model,  setModel]  = useState('')

  // قوائم الماركات والموديلات الديناميكية من البيانات نفسها
  const brands = useMemo(
    () => Array.from(new Set(devices.map(d => d.brand_name))).sort(),
    [devices],
  )

  const models = useMemo(() => {
    const base = brand ? devices.filter(d => d.brand_name === brand) : devices
    return Array.from(new Set(base.map(d => d.model_name))).sort()
  }, [devices, brand])

  // إعادة ضبط الموديل لما تتغير الماركة
  function handleBrandChange(b: string) {
    setBrand(b)
    setModel('')
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return devices.filter(r => {
      if (status && r.status    !== status) return false
      if (brand  && r.brand_name !== brand)  return false
      if (model  && r.model_name !== model)  return false
      if (!q) return true
      return (
        r.imei1.includes(q)                     ||
        r.imei2.includes(q)                     ||
        r.brand_name.toLowerCase().includes(q)  ||
        r.model_name.toLowerCase().includes(q)  ||
        r.storage.toLowerCase().includes(q)     ||
        r.color.toLowerCase().includes(q)
      )
    })
  }, [devices, search, status, brand, model])

  const totalCost   = filtered.reduce((s, r) => s + r.cost_price,    0)
  const totalSell   = filtered.reduce((s, r) => s + r.selling_price, 0)
  const totalProfit = filtered.reduce((s, r) => s + r.profit,        0)
  const avgMargin   = filtered.length > 0
    ? filtered.reduce((s, r) => s + r.margin_pct, 0) / filtered.length
    : 0

  return (
    <div className="space-y-4">

      {/* شريط الفلاتر */}
      <div className="flex flex-wrap items-center gap-3">

        {/* بحث حر */}
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="بحث بـ IMEI · لون · تخزين..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-9 pr-8 pl-3 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* فلتر الماركة */}
        <select value={brand} onChange={e => handleBrandChange(e.target.value)} className={SEL}>
          <option value="">كل الماركات</option>
          {brands.map(b => <option key={b} value={b}>{b}</option>)}
        </select>

        {/* فلتر الموديل — يتفلتر حسب الماركة المختارة */}
        <select value={model} onChange={e => setModel(e.target.value)} className={SEL} disabled={models.length === 0}>
          <option value="">كل الموديلات</option>
          {models.map(m => <option key={m} value={m}>{m}</option>)}
        </select>

        {/* فلتر الحالة */}
        <select value={status} onChange={e => setStatus(e.target.value)} className={SEL}>
          {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        {/* تصدير */}
        <button
          onClick={() => exportPriceList(filtered)}
          className="h-9 px-4 flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors"
        >
          <Download size={14} />
          تصدير Excel
        </button>
        <button
          onClick={() => exportPriceListPdf(
            filtered.map(r => ({
              brand_name: r.brand_name, model_name: r.model_name, imei1: r.imei1,
              storage: r.storage, color: r.color, battery_health: r.battery_health,
              status_label: DEVICE_STATUS_MAP[r.status as keyof typeof DEVICE_STATUS_MAP]?.label ?? r.status,
              cost_price: r.cost_price, selling_price: r.selling_price, profit: r.profit,
            })),
            [brand, model, STATUS_OPTIONS.find(o => o.value === status)?.label].filter(Boolean).join(' · ') || 'كل الأجهزة',
            'download',
          )}
          disabled={filtered.length === 0}
          className="h-9 px-4 flex items-center gap-2 rounded-lg bg-[#0F2552] hover:bg-[#0B1B3F] disabled:opacity-50 text-white text-sm font-medium transition-colors"
        >
          <FileText size={14} />
          PDF
        </button>
      </div>

      {/* KPIs */}
      {!isLoading && filtered.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'عدد الأجهزة',      value: `${filtered.length} جهاز`,  color: 'text-blue-600 dark:text-blue-400'    },
            { label: 'إجمالي التكلفة',   value: `${fmt(totalCost)} ج`,       color: 'text-purple-600 dark:text-purple-400' },
            { label: 'إجمالي سعر البيع', value: `${fmt(totalSell)} ج`,       color: 'text-green-600 dark:text-green-400'   },
            { label: 'إجمالي الفرق',     value: `${fmt(totalProfit)} ج`,     color: totalProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400' },
          ].map(k => (
            <div key={k.label} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{k.label}</p>
              <p className={cn('text-lg font-bold', k.color)}>{k.value}</p>
              {k.label === 'إجمالي الفرق' && (
                <p className="text-xs text-gray-400 mt-0.5">هامش متوسط {avgMargin.toFixed(1)}%</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* الجدول */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">قائمة أسعار الأجهزة</h3>
          <span className="text-xs text-gray-400">{filtered.length} جهاز</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                {['#','الماركة','الموديل','IMEI 1','IMEI 2','تخزين','لون','بطارية','حالة','سعر الشراء','سعر البيع','الفرق','هامش %'].map(h => (
                  <th key={h} className="px-3 py-2.5 text-right text-xs font-bold text-gray-500 dark:text-gray-400 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {isLoading ? (
                <tr><td colSpan={13} className="px-4 py-10 text-center text-sm text-gray-400">جاري التحميل...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={13} className="px-4 py-10 text-center text-sm text-gray-400">لا توجد أجهزة</td></tr>
              ) : filtered.map((r, i) => {
                const st = DEVICE_STATUS_MAP[r.status as keyof typeof DEVICE_STATUS_MAP]
                return (
                  <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="px-3 py-2.5 text-xs text-gray-400">{i + 1}</td>
                    <td className="px-3 py-2.5 font-semibold text-gray-900 dark:text-white whitespace-nowrap">{r.brand_name}</td>
                    <td className="px-3 py-2.5 text-gray-700 dark:text-gray-300 whitespace-nowrap">{r.model_name}</td>
                    <td className="px-3 py-2.5 font-mono text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">{r.imei1}</td>
                    <td className="px-3 py-2.5 font-mono text-xs text-gray-500 dark:text-gray-500 whitespace-nowrap">{r.imei2 || '—'}</td>
                    <td className="px-3 py-2.5 text-center text-gray-600 dark:text-gray-400 whitespace-nowrap">{r.storage || '—'}</td>
                    <td className="px-3 py-2.5 text-gray-600 dark:text-gray-400 whitespace-nowrap">{r.color || '—'}</td>
                    <td className="px-3 py-2.5 text-center whitespace-nowrap">
                      {r.battery_health != null
                        ? <span className={cn('font-bold', batteryColor(r.battery_health))}>{r.battery_health}%</span>
                        : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      {st
                        ? <Badge variant={st.variant} dot>{st.label}</Badge>
                        : <Badge variant="neutral">{r.status}</Badge>
                      }
                    </td>
                    <td className="px-3 py-2.5 font-semibold text-red-600 dark:text-red-400 whitespace-nowrap">{fmt(r.cost_price)} ج</td>
                    <td className="px-3 py-2.5 font-semibold text-green-600 dark:text-green-400 whitespace-nowrap">{fmt(r.selling_price)} ج</td>
                    <td className={cn('px-3 py-2.5 font-bold whitespace-nowrap', r.profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400')}>
                      {r.profit >= 0 ? '+' : ''}{fmt(r.profit)} ج
                    </td>
                    <td className="px-3 py-2.5 text-center whitespace-nowrap">
                      <Badge variant={r.margin_pct >= 20 ? 'success' : r.margin_pct >= 10 ? 'warning' : r.margin_pct > 0 ? 'info' : 'neutral'}>
                        {r.margin_pct}%
                      </Badge>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            {!isLoading && filtered.length > 0 && (
              <tfoot>
                <tr className="bg-gray-50 dark:bg-gray-800/50 border-t-2 border-gray-200 dark:border-gray-700 font-bold text-sm">
                  <td colSpan={9} className="px-3 py-3 text-gray-600 dark:text-gray-400">الإجمالي ({filtered.length} جهاز)</td>
                  <td className="px-3 py-3 text-red-600 dark:text-red-400">{fmt(totalCost)} ج</td>
                  <td className="px-3 py-3 text-green-600 dark:text-green-400">{fmt(totalSell)} ج</td>
                  <td className={cn('px-3 py-3', totalProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400')}>
                    {totalProfit >= 0 ? '+' : ''}{fmt(totalProfit)} ج
                  </td>
                  <td className="px-3 py-3 text-center">
                    <Badge variant={avgMargin >= 20 ? 'success' : avgMargin >= 10 ? 'warning' : 'info'}>
                      {avgMargin.toFixed(1)}%
                    </Badge>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  )
}
