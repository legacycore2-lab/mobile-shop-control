// @ts-nocheck
// src/pages/reports/tabs/ProfitTab.tsx
import { cn } from '@/lib/cn'
import { fmt } from '@/lib/fmt'
import { Badge } from '@/components/ui/Badge'
import { KpiCard } from '../components/ReportWidgets'
import { TrendingUp, DollarSign, Package, Award } from 'lucide-react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function ProfitTabContent(props: Record<string, any>) {
  const { sales = [], saleLoad } = props

  // حساب إجماليات الربح
  const totalUnits   = sales.reduce((s: number, r: any) => s + r.total_units,   0)
  const totalCost    = sales.reduce((s: number, r: any) => s + r.total_cost,    0)
  const totalRev     = sales.reduce((s: number, r: any) => s + r.total_revenue, 0)
  const totalProfit  = sales.reduce((s: number, r: any) => s + r.profit,        0)
  const avgMargin    = totalCost > 0 ? ((totalProfit / totalCost) * 100) : 0

  // أعلى 3 موديلات ربحاً
  const top3 = [...sales].sort((a: any, b: any) => b.profit - a.profit).slice(0, 3)
  // أقل 3 (أو خاسرين)
  const worst3 = [...sales].sort((a: any, b: any) => a.profit - b.profit).slice(0, 3)

  return (
    <div className="space-y-5">

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="إجمالي الوحدات المباعة" value={totalUnits}                        icon={Package}    color="blue"   />
        <KpiCard label="إجمالي التكلفة"          value={`${fmt(totalCost)} ج`}             icon={DollarSign} color="red"    />
        <KpiCard label="إجمالي الإيرادات"        value={`${fmt(totalRev)} ج`}              icon={TrendingUp} color="green"  />
        <KpiCard
          label="صافي الربح الإجمالي"
          value={`${fmt(totalProfit)} ج`}
          sub={`هامش ${avgMargin.toFixed(1)}%`}
          icon={Award}
          color={totalProfit >= 0 ? 'green' : 'red'}
        />
      </div>

      {/* Highlights */}
      {sales.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* الأكثر ربحاً */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
            <p className="text-sm font-bold text-green-600 dark:text-green-400 mb-3 flex items-center gap-2">
              <Award size={14} /> الأعلى ربحاً
            </p>
            <div className="space-y-2">
              {top3.map((r: any, i: number) => (
                <div key={i} className="flex items-center justify-between gap-3 py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white',
                      i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-gray-400' : 'bg-orange-600',
                    )}>{i + 1}</span>
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{r.brand_name} {r.model_name}</p>
                      <p className="text-xs text-gray-400">{r.total_units} وحدة</p>
                    </div>
                  </div>
                  <p className="text-sm font-bold text-green-600 dark:text-green-400">{fmt(r.profit)} ج</p>
                </div>
              ))}
            </div>
          </div>

          {/* الأقل ربحاً */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
            <p className="text-sm font-bold text-red-500 mb-3 flex items-center gap-2">
              <TrendingUp size={14} className="rotate-180" /> الأقل ربحاً
            </p>
            <div className="space-y-2">
              {worst3.map((r: any, i: number) => (
                <div key={i} className="flex items-center justify-between gap-3 py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{r.brand_name} {r.model_name}</p>
                    <p className="text-xs text-gray-400">{r.total_units} وحدة</p>
                  </div>
                  <p className={cn('text-sm font-bold', r.profit >= 0 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400')}>
                    {fmt(r.profit)} ج
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* جدول تفصيلي */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">تفاصيل الربحية حسب الموديل</h3>
          <span className="text-xs text-gray-400">{sales.length} موديل</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                {['#', 'الماركة', 'الموديل', 'وحدات', 'تكلفة الوحدة', 'سعر البيع', 'ربح الوحدة', 'إجمالي الربح', 'هامش %'].map(h => (
                  <th key={h} className="px-3 py-2.5 text-right text-xs font-bold text-gray-500 dark:text-gray-400 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {saleLoad ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-sm text-gray-400">جاري التحميل...</td></tr>
              ) : sales.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-sm text-gray-400">لا توجد مبيعات في هذه الفترة</td></tr>
              ) : (
                sales.map((r: any, i: number) => {
                  const unitCost = r.total_units > 0 ? r.total_cost    / r.total_units : 0
                  const unitRev  = r.total_units > 0 ? r.total_revenue / r.total_units : 0
                  const unitPft  = unitRev - unitCost
                  return (
                    <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                      <td className="px-3 py-2.5 text-xs text-gray-400">{i + 1}</td>
                      <td className="px-3 py-2.5 font-semibold text-gray-900 dark:text-white">{r.brand_name}</td>
                      <td className="px-3 py-2.5 text-gray-700 dark:text-gray-300">{r.model_name}</td>
                      <td className="px-3 py-2.5 text-center font-bold text-blue-600 dark:text-blue-400">{r.total_units}</td>
                      <td className="px-3 py-2.5 text-red-600 dark:text-red-400">{fmt(unitCost)} ج</td>
                      <td className="px-3 py-2.5 text-green-600 dark:text-green-400">{fmt(unitRev)} ج</td>
                      <td className={cn('px-3 py-2.5 font-semibold', unitPft >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>
                        {fmt(unitPft)} ج
                      </td>
                      <td className={cn('px-3 py-2.5 font-bold', r.profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>
                        {fmt(r.profit)} ج
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <Badge variant={r.margin_pct >= 20 ? 'success' : r.margin_pct >= 10 ? 'warning' : 'danger'}>
                          {r.margin_pct}%
                        </Badge>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
            {sales.length > 0 && (
              <tfoot>
                <tr className="bg-blue-50 dark:bg-blue-900/10 border-t-2 border-blue-200 dark:border-blue-800">
                  <td colSpan={3} className="px-3 py-2.5 text-xs font-bold text-blue-700 dark:text-blue-400">الإجمالي</td>
                  <td className="px-3 py-2.5 text-center font-bold text-gray-900 dark:text-white">{totalUnits}</td>
                  <td colSpan={2} />
                  <td />
                  <td className={cn('px-3 py-2.5 font-bold', totalProfit >= 0 ? 'text-green-600' : 'text-red-600')}>
                    {fmt(totalProfit)} ج
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <Badge variant={avgMargin >= 20 ? 'success' : avgMargin >= 10 ? 'warning' : 'danger'}>
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
