// src/pages/reports/tabs/ExpensesReportTab.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo } from 'react'
import { cn } from '@/lib/cn'
import { fmt } from '@/lib/fmt'
import { KpiCard, BarChart } from '../components/ReportWidgets'
import { TrendingDown, DollarSign, Calendar, Tag, ArrowUpRight, ArrowDownRight } from 'lucide-react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function ExpensesReportTabContent(props: Record<string, any>) {
  const { expenses = [], expLoad } = props

  // تجميع شهري
  const monthly = useMemo(() => {
    const map = new Map<string, number>()
    for (const e of expenses) {
      const ym = e.expense_date?.slice(0, 7) ?? ''
      if (!ym) continue
      map.set(ym, (map.get(ym) ?? 0) + Number(e.amount ?? 0))
    }
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([ym, total]) => ({
        label: new Date(ym + '-01').toLocaleDateString('ar-EG', { month: 'short', year: '2-digit' }),
        value: total,
        ym,
      }))
  }, [expenses])

  // تجميع حسب الفئة
  const byCategory = useMemo(() => {
    const map = new Map<string, { name: string; total: number; count: number }>()
    for (const e of expenses) {
      const cat = e.category_name ?? 'غير محدد'
      const cur = map.get(cat) ?? { name: cat, total: 0, count: 0 }
      cur.total += Number(e.amount ?? 0)
      cur.count++
      map.set(cat, cur)
    }
    return [...map.values()].sort((a: any, b: any) => b.total - a.total)
  }, [expenses])

  // KPIs
  const totalAll    = expenses.reduce((s: number, e: any) => s + Number(e.amount ?? 0), 0)
  const now         = new Date()
  const thisYM      = now.toISOString().slice(0, 7)
  const lastDate    = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastYM      = lastDate.toISOString().slice(0, 7)
  const thisMonthTotal = expenses.filter((e: any) => e.expense_date?.startsWith(thisYM)).reduce((s: number, e: any) => s + Number(e.amount ?? 0), 0)
  const lastMonthTotal = expenses.filter((e: any) => e.expense_date?.startsWith(lastYM)).reduce((s: number, e: any) => s + Number(e.amount ?? 0), 0)
  const monthDiff      = thisMonthTotal - lastMonthTotal
  const monthDiffPct   = lastMonthTotal > 0 ? ((monthDiff / lastMonthTotal) * 100).toFixed(1) : null

  return (
    <div className="space-y-5">

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="إجمالي المصروفات"    value={`${fmt(totalAll)} ج`}         icon={TrendingDown} color="red"    />
        <KpiCard label="مصروفات هذا الشهر"   value={`${fmt(thisMonthTotal)} ج`}   icon={Calendar}     color="amber"  />
        <KpiCard label="مصروفات الشهر الماضي" value={`${fmt(lastMonthTotal)} ج`}  icon={DollarSign}   color="blue"   />
        <KpiCard
          label="الفرق عن الشهر الماضي"
          value={`${monthDiff >= 0 ? '+' : ''}${fmt(Math.abs(monthDiff))} ج`}
          sub={monthDiffPct ? `${monthDiffPct}%` : undefined}
          icon={monthDiff >= 0 ? ArrowUpRight : ArrowDownRight}
          color={monthDiff <= 0 ? 'green' : 'red'}
        />
      </div>

      {/* Chart شهري */}
      {monthly.length > 0 && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
          <p className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Calendar size={14} className="text-amber-500" /> المصروفات الشهرية (آخر 12 شهر)
          </p>
          <BarChart data={monthly} valueKey="value" labelKey="label" color="amber" height={160} />
        </div>
      )}

      {/* جداول */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* حسب الفئة */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">المصروفات حسب الفئة</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                  {['الفئة', 'عدد', 'الإجمالي', 'النسبة'].map(h => (
                    <th key={h} className="px-3 py-2.5 text-right text-xs font-bold text-gray-500 dark:text-gray-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {expLoad ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-400">جاري التحميل...</td></tr>
                ) : byCategory.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-400">لا توجد مصروفات</td></tr>
                ) : byCategory.map((c, i) => {
                  const pct = totalAll > 0 ? ((c.total / totalAll) * 100).toFixed(1) : '0'
                  return (
                    <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                      <td className="px-3 py-2.5 font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <Tag size={12} className="text-amber-500 flex-shrink-0" /> {c.name}
                      </td>
                      <td className="px-3 py-2.5 text-gray-500 dark:text-gray-400">{c.count}</td>
                      <td className="px-3 py-2.5 font-bold text-red-600 dark:text-red-400">{fmt(c.total)} ج</td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                            <div className="h-full bg-amber-500 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-gray-500 w-8 text-left">{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              {byCategory.length > 0 && (
                <tfoot>
                  <tr className="bg-amber-50 dark:bg-amber-900/10 border-t-2 border-amber-200 dark:border-amber-800">
                    <td className="px-3 py-2.5 text-xs font-bold text-amber-700 dark:text-amber-400">الإجمالي</td>
                    <td className="px-3 py-2.5 text-gray-600 dark:text-gray-400 font-semibold">{expenses.length}</td>
                    <td className="px-3 py-2.5 font-bold text-red-600">{fmt(totalAll)} ج</td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* آخر 15 مصروف */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">آخر المصروفات</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                  {['التاريخ', 'الفئة', 'الوصف', 'المبلغ'].map(h => (
                    <th key={h} className="px-3 py-2.5 text-right text-xs font-bold text-gray-500 dark:text-gray-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {expLoad ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-400">جاري التحميل...</td></tr>
                ) : expenses.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-400">لا توجد مصروفات</td></tr>
                ) : expenses.slice(0, 15).map((e: any, i: number) => (
                  <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                    <td className="px-3 py-2.5 text-xs text-gray-500 whitespace-nowrap">{e.expense_date}</td>
                    <td className="px-3 py-2.5 text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">{e.category_name}</td>
                    <td className="px-3 py-2.5 text-gray-700 dark:text-gray-300 max-w-[120px] truncate">{e.description ?? '—'}</td>
                    <td className="px-3 py-2.5 font-bold text-red-600 dark:text-red-400 whitespace-nowrap">{fmt(Number(e.amount))} ج</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
