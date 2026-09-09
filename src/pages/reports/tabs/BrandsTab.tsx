// @ts-nocheck
// src/pages/reports/tabs/BrandsTab.tsx
import { useMemo } from 'react'
import { cn } from '@/lib/cn'
import { fmt } from '@/lib/fmt'
import { Badge } from '@/components/ui/Badge'
import { KpiCard, BarChart } from '../components/ReportWidgets'
import { Smartphone, TrendingUp, DollarSign, Award, Package } from 'lucide-react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function BrandsTabContent(props: Record<string, any>) {
  const { sales = [], stock = [], saleLoad, stckLoad } = props

  // تجميع مبيعات حسب البراند
  const brandSales = useMemo(() => {
    const map = new Map<string, { brand: string; units: number; revenue: number; cost: number; profit: number }>()
    for (const r of sales) {
      const e = map.get(r.brand_name) ?? { brand: r.brand_name, units: 0, revenue: 0, cost: 0, profit: 0 }
      e.units   += r.total_units
      e.revenue += r.total_revenue
      e.cost    += r.total_cost
      e.profit  += r.profit
      map.set(r.brand_name, e)
    }
    return [...map.values()].sort((a, b) => b.units - a.units)
  }, [sales])

  // تجميع مخزون حسب البراند
  const brandStock = useMemo(() => {
    const map = new Map<string, { brand: string; count: number; cost_value: number; sell_value: number }>()
    for (const r of stock) {
      const e = map.get(r.brand_name) ?? { brand: r.brand_name, count: 0, cost_value: 0, sell_value: 0 }
      e.count      += r.count
      e.cost_value += r.total_cost
      e.sell_value += r.total_selling
      map.set(r.brand_name, e)
    }
    return [...map.values()].sort((a, b) => b.count - a.count)
  }, [stock])

  const totalUnitsSold  = brandSales.reduce((s, r) => s + r.units,   0)
  const totalRevenue    = brandSales.reduce((s, r) => s + r.revenue,  0)
  const totalProfit     = brandSales.reduce((s, r) => s + r.profit,   0)
  const totalStockUnits = brandStock.reduce((s, r) => s + r.count,    0)

  const loading = saleLoad || stckLoad

  return (
    <div className="space-y-5">

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="عدد البراندات (مبيعات)" value={brandSales.length}          icon={Award}      color="purple" />
        <KpiCard label="إجمالي الوحدات المباعة"  value={totalUnitsSold}             icon={Smartphone} color="blue"   />
        <KpiCard label="إجمالي الإيرادات"        value={`${fmt(totalRevenue)} ج`}  icon={DollarSign} color="green"  />
        <KpiCard label="صافي الربح الكلي"        value={`${fmt(totalProfit)} ج`}   icon={TrendingUp} color="green"  />
      </div>

      {/* Bar Chart مبيعات */}
      {brandSales.length > 0 && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
          <p className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Smartphone size={14} className="text-blue-500" /> الوحدات المباعة حسب البراند
          </p>
          <BarChart
            data={brandSales.map(b => ({ label: b.brand, value: b.units }))}
            valueKey="value"
            labelKey="label"
            color="blue"
            height={160}
          />
        </div>
      )}

      {/* جداول جنب بعض */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* مبيعات البراندات */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">أداء البراندات — المبيعات</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                  {['#', 'البراند', 'وحدات', 'إيرادات', 'ربح', 'حصة %'].map(h => (
                    <th key={h} className="px-3 py-2.5 text-right text-xs font-bold text-gray-500 dark:text-gray-400 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {loading ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">جاري التحميل...</td></tr>
                ) : brandSales.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">لا توجد بيانات</td></tr>
                ) : brandSales.map((b, i) => {
                  const share = totalUnitsSold > 0 ? ((b.units / totalUnitsSold) * 100).toFixed(1) : '0'
                  const margin = b.cost > 0 ? ((b.profit / b.cost) * 100).toFixed(1) : '0'
                  return (
                    <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                      <td className="px-3 py-2.5 text-xs text-gray-400">{i + 1}</td>
                      <td className="px-3 py-2.5 font-bold text-gray-900 dark:text-white">{b.brand}</td>
                      <td className="px-3 py-2.5 text-center font-bold text-blue-600 dark:text-blue-400">{b.units}</td>
                      <td className="px-3 py-2.5 text-green-600 dark:text-green-400 font-semibold">{fmt(b.revenue)} ج</td>
                      <td className={cn('px-3 py-2.5 font-bold', b.profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500')}>
                        {fmt(b.profit)} ج
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${share}%` }} />
                          </div>
                          <span className="text-xs text-gray-500 w-8 text-left">{share}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              {brandSales.length > 0 && (
                <tfoot>
                  <tr className="bg-blue-50 dark:bg-blue-900/10 border-t-2 border-blue-200 dark:border-blue-800">
                    <td colSpan={2} className="px-3 py-2.5 text-xs font-bold text-blue-700 dark:text-blue-400">الإجمالي</td>
                    <td className="px-3 py-2.5 text-center font-bold text-gray-900 dark:text-white">{totalUnitsSold}</td>
                    <td className="px-3 py-2.5 font-bold text-green-600">{fmt(totalRevenue)} ج</td>
                    <td className="px-3 py-2.5 font-bold text-green-600">{fmt(totalProfit)} ج</td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* مخزون البراندات */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">البراندات — المخزون الحالي</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                  {['#', 'البراند', 'وحدات', 'قيمة التكلفة', 'قيمة البيع', 'حصة %'].map(h => (
                    <th key={h} className="px-3 py-2.5 text-right text-xs font-bold text-gray-500 dark:text-gray-400 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {loading ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">جاري التحميل...</td></tr>
                ) : brandStock.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">المخزون فارغ</td></tr>
                ) : brandStock.map((b, i) => {
                  const share = totalStockUnits > 0 ? ((b.count / totalStockUnits) * 100).toFixed(1) : '0'
                  return (
                    <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                      <td className="px-3 py-2.5 text-xs text-gray-400">{i + 1}</td>
                      <td className="px-3 py-2.5 font-bold text-gray-900 dark:text-white">{b.brand}</td>
                      <td className="px-3 py-2.5 text-center font-bold text-blue-600 dark:text-blue-400">{b.count}</td>
                      <td className="px-3 py-2.5 text-red-500 dark:text-red-400">{fmt(b.cost_value)} ج</td>
                      <td className="px-3 py-2.5 text-green-600 dark:text-green-400 font-semibold">{fmt(b.sell_value)} ج</td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                            <div className="h-full bg-purple-500 rounded-full" style={{ width: `${share}%` }} />
                          </div>
                          <span className="text-xs text-gray-500 w-8 text-left">{share}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              {brandStock.length > 0 && (
                <tfoot>
                  <tr className="bg-purple-50 dark:bg-purple-900/10 border-t-2 border-purple-200 dark:border-purple-800">
                    <td colSpan={2} className="px-3 py-2.5 text-xs font-bold text-purple-700 dark:text-purple-400">الإجمالي</td>
                    <td className="px-3 py-2.5 text-center font-bold text-gray-900 dark:text-white">{totalStockUnits}</td>
                    <td className="px-3 py-2.5 font-bold text-red-500">{fmt(brandStock.reduce((s, b) => s + b.cost_value, 0))} ج</td>
                    <td className="px-3 py-2.5 font-bold text-green-600">{fmt(brandStock.reduce((s, b) => s + b.sell_value, 0))} ج</td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
