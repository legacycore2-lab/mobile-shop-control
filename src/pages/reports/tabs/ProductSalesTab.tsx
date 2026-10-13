// src/pages/reports/tabs/ProductSalesTab.tsx
// مبيعات المنتجات (إكسسوارات وقطع غيار) حسب الصنف
import { useMemo } from 'react'
import { DollarSign, Package, TrendingUp, Layers } from 'lucide-react'
import { cn } from '@/lib/cn'
import { fmt } from '@/lib/fmt'
import { KpiCard } from '../components/ReportWidgets'
import { useProfitability } from '@/hooks/useProfitability'
import { profitabilityService } from '@/services/profitability.service'

interface Props {
  from?: string
  to?:   string
}

export function ProductSalesTabContent({ from, to }: Props) {
  const { data: allRows = [], isLoading, isError } = useProfitability(from, to)

  const rows = useMemo(
    () => profitabilityService.select(allRows, 'product').sort((a, b) => b.units - a.units),
    [allRows],
  )
  const totals = useMemo(() => profitabilityService.totals(rows), [rows])

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="أصناف مباعة"          value={fmt(rows.length)}           icon={Layers}     color="blue"  />
        <KpiCard label="إجمالي الوحدات"        value={fmt(totals.units)}          icon={Package}    color="teal"  />
        <KpiCard label="إجمالي الإيرادات"      value={`${fmt(totals.revenue)} ج`} icon={DollarSign} color="green" />
        <KpiCard label="صافي الربح"            value={`${fmt(totals.profit)} ج`}  icon={TrendingUp} color={totals.profit >= 0 ? 'green' : 'red'} />
      </div>

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">مبيعات المنتجات حسب الصنف</h3>
          <span className="text-xs text-gray-400">{rows.length} صنف</span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : isError ? (
          <p className="text-center text-sm text-red-500 py-10">تعذّر تحميل التقرير، حاول تاني</p>
        ) : rows.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-10">مفيش مبيعات منتجات مؤكدة في الفترة دي</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                  {['#', 'الصنف', 'التصنيف', 'وحدات', 'إجمالي التكلفة', 'إجمالي الإيرادات', 'صافي الربح', 'هامش %'].map(h => (
                    <th key={h} className="px-3 py-2.5 text-right text-xs font-bold text-gray-500 dark:text-gray-400 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {rows.map((r, i) => (
                  <tr key={r.key} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                    <td className="px-3 py-2.5 text-xs text-gray-400">{i + 1}</td>
                    <td dir="auto" className="px-3 py-2.5 font-semibold text-gray-900 dark:text-white">{r.name}</td>
                    <td dir="auto" className="px-3 py-2.5 text-gray-500 dark:text-gray-400">{r.subtitle}</td>
                    <td className="px-3 py-2.5 font-bold text-blue-600 dark:text-blue-400">{fmt(r.units)}</td>
                    <td className="px-3 py-2.5 text-red-600 dark:text-red-400">{fmt(r.cost)} ج</td>
                    <td className="px-3 py-2.5 text-green-600 dark:text-green-400">{fmt(r.revenue)} ج</td>
                    <td className={cn('px-3 py-2.5 font-bold', r.profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>
                      {fmt(r.profit)} ج
                    </td>
                    <td className="px-3 py-2.5 text-gray-700 dark:text-gray-300">{r.margin_pct.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-blue-50 dark:bg-blue-900/10 border-t-2 border-blue-200 dark:border-blue-800 font-bold">
                  <td colSpan={3} className="px-3 py-2.5 text-xs text-blue-700 dark:text-blue-400">الإجمالي</td>
                  <td className="px-3 py-2.5 text-gray-900 dark:text-white">{fmt(totals.units)}</td>
                  <td className="px-3 py-2.5 text-red-600">{fmt(totals.cost)} ج</td>
                  <td className="px-3 py-2.5 text-green-600">{fmt(totals.revenue)} ج</td>
                  <td className="px-3 py-2.5 text-green-600">{fmt(totals.profit)} ج</td>
                  <td className="px-3 py-2.5">{totals.margin_pct.toFixed(1)}%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400 leading-relaxed">
        الإيراد بعد الخصم ومتوزع على بنود الفاتورة بنسبة سعر كل بند. الفواتير المؤكدة بس هي اللي بتتحسب.
      </p>
    </div>
  )
}
