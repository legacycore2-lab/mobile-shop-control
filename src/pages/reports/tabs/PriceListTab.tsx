// src/pages/reports/tabs/PriceListTab.tsx
// تقرير أسعار الأجهزة — سعر الشراء والبيع لكل جهاز على حدة
import { useState, useMemo } from 'react'
import { Search, Download } from 'lucide-react'
import { useDevicePriceList } from '@/hooks/useReports'
import { DEVICE_STATUS_MAP } from '@/constants/statusMaps'
import { Badge } from '@/components/ui/Badge'
import { fmt } from '@/lib/fmt'
import { cn } from '@/lib/cn'

const STATUS_OPTIONS = [
  { value: '',             label: 'الكل'        },
  { value: 'in_stock',    label: 'في المخزون'  },
  { value: 'sold',        label: 'مباع'         },
  { value: 'returned',    label: 'مُعاد'        },
  { value: 'defective',   label: 'تالف'         },
  { value: 'sent_to_repair', label: 'في الصيانة' },
]

function exportCsv(rows: ReturnType<typeof useDevicePriceList>['data']) {
  if (!rows?.length) return
  const headers = ['#', 'الماركة', 'الموديل', 'IMEI 1', 'IMEI 2', 'التخزين', 'اللون', 'الحالة', 'سعر الشراء', 'سعر البيع', 'الفرق', 'هامش%']
  const lines = rows.map((r, i) => [
    i + 1,
    r.brand_name,
    r.model_name,
    r.imei1,
    r.imei2,
    r.storage,
    r.color,
    DEVICE_STATUS_MAP[r.status as keyof typeof DEVICE_STATUS_MAP]?.label ?? r.status,
    r.cost_price,
    r.selling_price,
    r.profit,
    r.margin_pct,
  ])
  const csv = '\uFEFF' + [headers, ...lines].map(row => row.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `device-price-list-${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export function PriceListTabContent() {
  const { data: devices = [], isLoading } = useDevicePriceList()
  const [search, setSearch]   = useState('')
  const [status, setStatus]   = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return devices.filter(r => {
      if (status && r.status !== status) return false
      if (!q) return true
      return (
        r.brand_name.toLowerCase().includes(q)   ||
        r.model_name.toLowerCase().includes(q)   ||
        r.imei1.includes(q)                       ||
        r.imei2.includes(q)                       ||
        r.storage.toLowerCase().includes(q)       ||
        r.color.toLowerCase().includes(q)
      )
    })
  }, [devices, search, status])

  // إجماليات الصفوف المعروضة
  const totalCost   = filtered.reduce((s, r) => s + r.cost_price,    0)
  const totalSell   = filtered.reduce((s, r) => s + r.selling_price, 0)
  const totalProfit = filtered.reduce((s, r) => s + r.profit,        0)
  const avgMargin   = filtered.length > 0
    ? filtered.reduce((s, r) => s + r.margin_pct, 0) / filtered.length
    : 0

  return (
    <div className="space-y-4">

      {/* شريط التحكم */}
      <div className="flex flex-wrap items-center gap-3">
        {/* بحث */}
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="بحث بـ IMEI · موديل · لون · تخزين..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-9 pr-8 pl-3 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* فلتر الحالة */}
        <select
          value={status}
          onChange={e => setStatus(e.target.value)}
          className="h-9 border border-gray-200 dark:border-gray-700 rounded-lg px-3 text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:border-blue-500"
        >
          {STATUS_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {/* تصدير */}
        <button
          onClick={() => exportCsv(filtered)}
          className="h-9 px-4 flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors"
        >
          <Download size={14} />
          تصدير CSV
        </button>
      </div>

      {/* KPIs */}
      {!isLoading && filtered.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'عدد الأجهزة',      value: `${filtered.length} جهاز`,   color: 'text-blue-600 dark:text-blue-400'   },
            { label: 'إجمالي التكلفة',   value: `${fmt(totalCost)} ج`,        color: 'text-purple-600 dark:text-purple-400' },
            { label: 'إجمالي سعر البيع', value: `${fmt(totalSell)} ج`,        color: 'text-green-600 dark:text-green-400'  },
            { label: 'إجمالي الفرق',     value: `${fmt(totalProfit)} ج`,      color: totalProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400' },
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
                {['#', 'الماركة', 'الموديل', 'IMEI 1', 'IMEI 2', 'تخزين', 'لون', 'حالة', 'سعر الشراء', 'سعر البيع', 'الفرق', 'هامش %'].map(h => (
                  <th key={h} className="px-3 py-2.5 text-right text-xs font-bold text-gray-500 dark:text-gray-400 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {isLoading ? (
                <tr><td colSpan={12} className="px-4 py-10 text-center text-sm text-gray-400">جاري التحميل...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={12} className="px-4 py-10 text-center text-sm text-gray-400">لا توجد أجهزة</td></tr>
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
                  <td colSpan={8} className="px-3 py-3 text-gray-600 dark:text-gray-400">الإجمالي ({filtered.length} جهاز)</td>
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
