// src/pages/reports/tabs/ProfitTab.tsx
import { cn } from '@/lib/cn'
import { fmt } from '@/lib/fmt'
import { Badge } from '@/components/ui/Badge'
import { KpiCard } from '../components/ReportWidgets'
import { TrendingUp, DollarSign, Package, Award, Receipt } from 'lucide-react'
import type { DeviceSalesSummary, ReportSummary } from '@/services/reports.service'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function ProfitTabContent(props: Record<string, any>) {
  const { sales = [], summary, saleLoad, sumLoad } = props as {
    sales:    DeviceSalesSummary[]
    summary?: ReportSummary
    saleLoad: boolean
    sumLoad:  boolean
  }

  // حساب إجماليات من بيانات المبيعات
  const totalUnits  = sales.reduce((s, r) => s + r.total_units,   0)
  const totalCost   = sales.reduce((s, r) => s + r.total_cost,    0)
  const totalRev    = sales.reduce((s, r) => s + r.total_revenue, 0)
  const grossProfit = sales.reduce((s, r) => s + r.profit,        0)
  const grossMargin = totalCost > 0 ? (grossProfit / totalCost) * 100 : 0

  // من السمري
  const totalExpenses = summary?.totalExpenses ?? 0
  const netProfit     = summary?.netProfit     ?? (grossProfit - totalExpenses)
  const netMargin     = summary?.netMargin     ?? (totalRev > 0 ? (netProfit / totalRev) * 100 : 0)

  const top3   = [...sales].sort((a, b) => b.profit - a.profit).slice(0, 3)
  const worst3 = [...sales].sort((a, b) => a.profit - b.profit).slice(0, 3)

  return (
    <div className="space-y-5">

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="إجمالي الوحدات المباعة" value={totalUnits}            icon={Package}    color="blue"  />
        <KpiCard label="إجمالي التكلفة"          value={`${fmt(totalCost)} ج`}   icon={DollarSign} color="purple" />
        <KpiCard label="إجمالي المصروفات"       value={`${fmt(totalExpenses)} ج`} icon={Receipt}    color="red"   />
        <KpiCard
          label="صافي الربح"
          value={`${fmt(netProfit)} ج`}
          sub={`هامش صافي ${netMargin.toFixed(1)}%`}
          icon={Award}
          color={netProfit >= 0 ? 'green' : 'red'}
        />
      </div>

      {/* مربحية تفصيلية */}
      {!saleLoad && !sumLoad && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
          <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4">تحليل الربحية</p>
          <div className="space-y-3">
            {/* إيرادات */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-gray-700 dark:text-gray-300">إجمالي الإيرادات</span>
                <span className="text-green-600 dark:text-green-400 font-bold">{fmt(totalRev)} ج</span>
              </div>
              <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-full"><div className="h-full bg-green-500 rounded-full w-full" /></div>
            </div>
            {/* تكلفة */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-gray-700 dark:text-gray-300">تكلفة البضاعة المباعة</span>
                <span className="text-purple-600 dark:text-purple-400 font-bold">− {fmt(totalCost)} ج</span>
              </div>
              <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full bg-purple-500 rounded-full" style={{ width: totalRev > 0 ? `${(totalCost / totalRev) * 100}%` : '0%' }} />
              </div>
            </div>
            {/* ربح إجمالي */}
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 pr-1">
              <span>الربح الإجمالي</span>
              <span className={grossProfit >= 0 ? 'text-green-600 dark:text-green-400 font-semibold' : 'text-red-600 font-semibold'}>
                {fmt(grossProfit)} ج ({grossMargin.toFixed(1)}%)
              </span>
            </div>
            {/* مصروفات */}
            {totalExpenses > 0 && (
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-gray-700 dark:text-gray-300">إجمالي المصروفات</span>
                  <span className="text-red-600 dark:text-red-400 font-bold">− {fmt(totalExpenses)} ج</span>
                </div>
                <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full bg-red-500 rounded-full" style={{ width: totalRev > 0 ? `${(totalExpenses / totalRev) * 100}%` : '0%' }} />
                </div>
              </div>
            )}
            {/* صافي الربح */}
            <div className={cn(
              'rounded-xl border p-3 flex items-center justify-between mt-1',
              netProfit >= 0
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
            )}>
              <span className={cn('text-sm font-bold', netProfit >= 0 ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300')}>
                {netProfit >= 0 ? 'صافي الربح النهائي' : 'صافي الخسارة'}
              </span>
              <span className="text-lg font-bold text-gray-900 dark:text-white">{fmt(Math.abs(netProfit))} ج</span>
            </div>
          </div>
        </div>
      )}

      {/* Highlights */}
      {sales.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
            <p className="text-sm font-bold text-green-600 dark:text-green-400 mb-3 flex items-center gap-2">
              <Award size={14} /> الأعلى ربحاً
            </p>
            <div className="space-y-2">
              {top3.map((r, i) => (
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

          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
            <p className="text-sm font-bold text-red-500 mb-3 flex items-center gap-2">
              <TrendingUp size={14} className="rotate-180" /> الأقل ربحاً
            </p>
            <div className="space-y-2">
              {worst3.map((r, i) => (
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
              ) : sales.map((r, i) => {
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
              }
            </tbody>
            {sales.length > 0 && (
              <tfoot>
                <tr className="bg-blue-50 dark:bg-blue-900/10 border-t-2 border-blue-200 dark:border-blue-800">
                  <td colSpan={3} className="px-3 py-2.5 text-xs font-bold text-blue-700 dark:text-blue-400">الربح الإجمالي</td>
                  <td className="px-3 py-2.5 text-center font-bold text-gray-900 dark:text-white">{totalUnits}</td>
                  <td colSpan={3} />
                  <td className={cn('px-3 py-2.5 font-bold', grossProfit >= 0 ? 'text-green-600' : 'text-red-600')}>
                    {fmt(grossProfit)} ج
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <Badge variant={grossMargin >= 20 ? 'success' : grossMargin >= 10 ? 'warning' : 'danger'}>
                      {grossMargin.toFixed(1)}%
                    </Badge>
                  </td>
                </tr>
                {totalExpenses > 0 && (
                  <tr className="bg-red-50 dark:bg-red-900/10 border-t border-red-200 dark:border-red-800">
                    <td colSpan={7} className="px-3 py-2 text-xs font-semibold text-red-600 dark:text-red-400">مطروحاً: إجمالي المصروفات</td>
                    <td className="px-3 py-2 font-bold text-red-600 dark:text-red-400">− {fmt(totalExpenses)} ج</td>
                    <td />
                  </tr>
                )}
                <tr className={cn(
                  'border-t-2',
                  netProfit >= 0 ? 'bg-green-50 dark:bg-green-900/10 border-green-300 dark:border-green-700' : 'bg-red-50 dark:bg-red-900/10 border-red-300 dark:border-red-700',
                )}>
                  <td colSpan={7} className={cn('px-3 py-2.5 text-sm font-bold', netProfit >= 0 ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300')}>
                    صافي الربح النهائي
                  </td>
                  <td className={cn('px-3 py-2.5 text-base font-bold', netProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>
                    {fmt(netProfit)} ج
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <Badge variant={netMargin >= 15 ? 'success' : netMargin >= 5 ? 'warning' : 'danger'}>
                      {netMargin.toFixed(1)}%
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
