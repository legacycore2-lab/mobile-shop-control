// src/pages/reports/tabs/CashierTab.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
import { cn } from '@/lib/cn'
import { fmt } from '@/lib/fmt'
import { Badge } from '@/components/ui/Badge'
import { KpiCard } from '../components/ReportWidgets'
import { Users, TrendingUp, DollarSign, Award, Smartphone, Package } from 'lucide-react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function CashierTabContent(props: Record<string, any>) {
  const { cashierData = [], cashierLoad } = props

  const totalRevenue  = cashierData.reduce((s: number, c: any) => s + c.total_revenue,  0)
  const totalInvoices = cashierData.reduce((s: number, c: any) => s + c.invoice_count,  0)
  const totalDevices  = cashierData.reduce((s: number, c: any) => s + c.total_devices,  0)
  const topCashier    = cashierData[0]

  return (
    <div className="space-y-5">

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="عدد الكاشيرات"        value={cashierData.length}           icon={Users}      color="purple" />
        <KpiCard label="إجمالي الفواتير"       value={totalInvoices}                icon={TrendingUp} color="blue"   />
        <KpiCard label="إجمالي الإيرادات"      value={`${fmt(totalRevenue)} ج`}    icon={DollarSign} color="green"  />
        <KpiCard
          label="الأفضل أداءً"
          value={topCashier?.cashier_name ?? '—'}
          sub={topCashier ? `${fmt(topCashier.total_revenue)} ج` : undefined}
          icon={Award}
          color="amber"
        />
      </div>

      {/* جدول الأداء */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">أداء الكاشيرات التفصيلي</h3>
          <span className="text-xs text-gray-400">{cashierData.length} موظف</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                {['#', 'الموظف', 'فواتير', 'أجهزة', 'منتجات', 'إجمالي الإيرادات', 'متوسط الفاتورة', 'الحصة'].map(h => (
                  <th key={h} className="px-3 py-2.5 text-right text-xs font-bold text-gray-500 dark:text-gray-400 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {cashierLoad ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-400">جاري التحميل...</td></tr>
              ) : cashierData.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-400">لا توجد بيانات مبيعات</td></tr>
              ) : cashierData.map((c: any, i: number) => {
                const share = totalRevenue > 0 ? ((c.total_revenue / totalRevenue) * 100).toFixed(1) : '0'
                return (
                  <tr key={i} className={cn('hover:bg-gray-50 dark:hover:bg-gray-800/30', i === 0 && 'bg-amber-50/50 dark:bg-amber-900/5')}>
                    <td className="px-3 py-2.5">
                      {i === 0
                        ? <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">🥇</span>
                        : <span className="text-xs text-gray-400">{i + 1}</span>
                      }
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                          <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                            {c.cashier_name.charAt(0)}
                          </span>
                        </div>
                        <span className="font-semibold text-gray-900 dark:text-white">{c.cashier_name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-center font-bold text-blue-600 dark:text-blue-400">{c.invoice_count}</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className="flex items-center gap-1 text-gray-700 dark:text-gray-300">
                        <Smartphone size={11} /> {c.total_devices}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className="flex items-center gap-1 text-gray-700 dark:text-gray-300">
                        <Package size={11} /> {c.total_products}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-bold text-green-600 dark:text-green-400">{fmt(c.total_revenue)} ج</td>
                    <td className="px-3 py-2.5 text-gray-600 dark:text-gray-400">{fmt(c.avg_invoice)} ج</td>
                    <td className="px-3 py-2.5 min-w-[100px]">
                      <div className="flex items-center gap-1.5">
                        <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                          <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${share}%` }} />
                        </div>
                        <span className="text-xs text-gray-500 w-8 text-left">{share}%</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            {cashierData.length > 0 && (
              <tfoot>
                <tr className="bg-blue-50 dark:bg-blue-900/10 border-t-2 border-blue-200 dark:border-blue-800">
                  <td colSpan={2} className="px-3 py-2.5 text-xs font-bold text-blue-700 dark:text-blue-400">الإجمالي</td>
                  <td className="px-3 py-2.5 text-center font-bold text-gray-900 dark:text-white">{totalInvoices}</td>
                  <td className="px-3 py-2.5 text-center font-bold text-gray-900 dark:text-white">{totalDevices}</td>
                  <td className="px-3 py-2.5 text-center font-bold text-gray-900 dark:text-white">
                    {cashierData.reduce((s: number, c: any) => s + c.total_products, 0)}
                  </td>
                  <td className="px-3 py-2.5 font-bold text-green-600">{fmt(totalRevenue)} ج</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Cards تفصيلية لكل موظف */}
      {cashierData.length > 0 && (
        <div>
          <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">بطاقات الأداء</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {cashierData.map((c: any, i: number) => {
              const share    = totalRevenue > 0 ? ((c.total_revenue / totalRevenue) * 100).toFixed(1) : '0'
              const isTop    = i === 0
              return (
                <div key={i} className={cn(
                  'bg-white dark:bg-gray-900 border rounded-xl p-4',
                  isTop ? 'border-amber-300 dark:border-amber-700' : 'border-gray-200 dark:border-gray-800',
                )}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center',
                        isTop ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-blue-100 dark:bg-blue-900/30',
                      )}>
                        <span className={cn('text-sm font-bold', isTop ? 'text-amber-600' : 'text-blue-600')}>
                          {c.cashier_name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{c.cashier_name}</p>
                        {isTop && <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">الأفضل أداءً ⭐</p>}
                      </div>
                    </div>
                    <Badge variant={isTop ? 'warning' : 'info'}>{share}%</Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2">
                      <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{c.invoice_count}</p>
                      <p className="text-[10px] text-gray-400">فاتورة</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2">
                      <p className="text-lg font-bold text-gray-900 dark:text-white">{c.total_devices}</p>
                      <p className="text-[10px] text-gray-400">جهاز</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2">
                      <p className="text-lg font-bold text-gray-900 dark:text-white">{c.total_products}</p>
                      <p className="text-[10px] text-gray-400">منتج</p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                    <span className="text-xs text-gray-500">إجمالي الإيرادات</span>
                    <span className="text-sm font-bold text-green-600 dark:text-green-400">{fmt(c.total_revenue)} ج</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-xs text-gray-500">متوسط الفاتورة</span>
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{fmt(c.avg_invoice)} ج</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
