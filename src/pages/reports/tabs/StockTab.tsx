// @ts-nocheck
// src/pages/reports/tabs/StockTab.tsx
import { cn } from '@/lib/cn'
import { fmt } from '@/constants/statusMaps'
import { Badge } from '@/components/ui/Badge'
import { KpiCard, BarChart } from '../components/ReportWidgets'
import {
  Smartphone, Package, DollarSign, TrendingUp, BarChart2,
  AlertTriangle, RefreshCw, Download, Calendar, Tag, Truck,
  Users, CheckCircle, Printer,
} from 'lucide-react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function StockTabContent(props: Record<string, any>) {
  const {
    summary, sales, stock, suppliers, activity, lowStock, customers,
    supplierLedger, prodMovement, devMovement,
    saleLoad, stckLoad, supLoad, actLoad, lowLoad, custLoad, prodMovLoad, devMovLoad,
    movFrom, movTo, movType, setMovFrom, setMovTo, setMovType,
    selectedSupplierId, setSelectedSupplierId,
    refetchProd, refetchDev, exportMovementCsv,
    filterFrom, filterTo,
  } = props

  return (
    <>
<div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard label="موديلات في المخزون"      value={stock.length}                                                       icon={Package}    color="blue"  />
            <KpiCard label="إجمالي الوحدات"          value={stock.reduce((s,r)=>s+r.count,0)}                                  icon={Smartphone} color="teal"  />
            <KpiCard label="قيمة التكلفة"            value={`${fmt(stock.reduce((s,r)=>s+r.total_cost,0))} ج`}                icon={DollarSign} color="amber" />
            <KpiCard label="قيمة البيع المتوقعة"     value={`${fmt(stock.reduce((s,r)=>s+r.total_selling,0))} ج`}             icon={TrendingUp} color="green" />
          </div>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">تفاصيل المخزون</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                    {['#','الماركة','الموديل','الكمية','إجمالي التكلفة','إجمالي البيع المتوقع','الربح المتوقع'].map(h=>(
                      <th key={h} className="px-3 py-2.5 text-right text-xs font-bold text-gray-500 dark:text-gray-400 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {stckLoad ? <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">جاري التحميل...</td></tr>
                  : stock.map((r,i)=>(
                    <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                      <td className="px-3 py-2.5 text-xs text-gray-400">{i+1}</td>
                      <td className="px-3 py-2.5 font-semibold text-gray-900 dark:text-white">{r.brand_name}</td>
                      <td className="px-3 py-2.5 text-gray-700 dark:text-gray-300">{r.model_name}</td>
                      <td className="px-3 py-2.5 text-center font-bold text-blue-600 dark:text-blue-400">{r.count}</td>
                      <td className="px-3 py-2.5 text-amber-600 dark:text-amber-400">{fmt(r.total_cost)} ج</td>
                      <td className="px-3 py-2.5 text-green-600 dark:text-green-400 font-semibold">{fmt(r.total_selling)} ج</td>
                      <td className="px-3 py-2.5 font-bold text-green-600 dark:text-green-400">{fmt(r.total_selling-r.total_cost)} ج</td>
                    </tr>
                  ))}
                </tbody>
                {stock.length>0&&<tfoot>
                  <tr className="bg-blue-50 dark:bg-blue-900/10 border-t-2 border-blue-200 dark:border-blue-800">
                    <td className="px-3 py-2.5 text-xs font-bold text-blue-700 dark:text-blue-400" colSpan={3}>الإجمالي</td>
                    <td className="px-3 py-2.5 text-center font-bold text-gray-900 dark:text-white">{stock.reduce((s,r)=>s+r.count,0)}</td>
                    <td className="px-3 py-2.5 font-bold text-amber-600">{fmt(stock.reduce((s,r)=>s+r.total_cost,0))} ج</td>
                    <td className="px-3 py-2.5 font-bold text-green-600">{fmt(stock.reduce((s,r)=>s+r.total_selling,0))} ج</td>
                    <td className="px-3 py-2.5 font-bold text-green-600">{fmt(stock.reduce((s,r)=>s+r.total_selling-r.total_cost,0))} ج</td>
                  </tr>
                </tfoot>}
              </table>
            </div>
          </div>

          {/* Products stock section */}
          {prodMovement.length > 0 && (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
                <Tag size={14} className="text-purple-600 dark:text-purple-400" />
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">مخزون المنتجات (إكسسوارات وقطع غيار)</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                      {['#','المنتج','الفئة','وحدة','الرصيد الحالي','سعر الشراء','قيمة المخزون','الحالة'].map(h=>(
                        <th key={h} className="px-3 py-2.5 text-right text-xs font-bold text-gray-500 dark:text-gray-400 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {prodMovement.map((r,i)=>(
                      <tr key={i} className={cn('hover:bg-gray-50 dark:hover:bg-gray-800/30', r.needs_reorder && 'bg-red-50/20 dark:bg-red-900/5')}>
                        <td className="px-3 py-2.5 text-xs text-gray-400">{i+1}</td>
                        <td className="px-3 py-2.5 font-semibold text-gray-900 dark:text-white">{r.name}</td>
                        <td className="px-3 py-2.5"><Badge variant="info">{r.category_name}</Badge></td>
                        <td className="px-3 py-2.5 text-xs text-gray-500">{r.unit}</td>
                        <td className="px-3 py-2.5 text-center font-bold text-blue-600 dark:text-blue-400">{r.current_stock}</td>
                        <td className="px-3 py-2.5 text-amber-600 dark:text-amber-400">{fmt(r.cost_price)} ج</td>
                        <td className="px-3 py-2.5 font-semibold text-purple-600 dark:text-purple-400">{fmt(r.stock_value)} ج</td>
                        <td className="px-3 py-2.5">
                          <Badge variant={r.needs_reorder ? 'danger' : 'success'}>
                            {r.needs_reorder ? 'يحتاج طلب' : 'كافٍ'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {prodMovement.length > 0 && (
                    <tfoot>
                      <tr className="bg-purple-50 dark:bg-purple-900/10 border-t-2 border-purple-200 dark:border-purple-800">
                        <td className="px-3 py-2.5 text-xs font-bold text-purple-700 dark:text-purple-400" colSpan={4}>الإجمالي</td>
                        <td className="px-3 py-2.5 text-center font-bold text-gray-900 dark:text-white">{prodMovement.reduce((s,r)=>s+r.current_stock,0)}</td>
                        <td/>
                        <td className="px-3 py-2.5 font-bold text-purple-600">{fmt(prodMovement.reduce((s,r)=>s+r.stock_value,0))} ج</td>
                        <td/>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          )}

          {/* Combined KPI */}
          {prodMovement.length > 0 && (
            <div className="bg-gradient-to-l from-blue-50 to-purple-50 dark:from-blue-900/10 dark:to-purple-900/10 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
              <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-3">إجمالي المخزون (أجهزة + منتجات)</p>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="text-center">
                  <p className="text-xs text-gray-500">أجهزة في المخزون</p>
                  <p className="text-xl font-bold text-blue-600">{stock.reduce((s,r)=>s+r.count,0)}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500">منتجات (وحدات)</p>
                  <p className="text-xl font-bold text-purple-600">{prodMovement.reduce((s,r)=>s+r.current_stock,0)}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500">قيمة الأجهزة</p>
                  <p className="text-xl font-bold text-amber-600">{fmt(stock.reduce((s,r)=>s+r.total_cost,0))} ج</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500">قيمة المنتجات</p>
                  <p className="text-xl font-bold text-purple-600">{fmt(prodMovement.reduce((s,r)=>s+r.stock_value,0))} ج</p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-800 flex justify-between items-center">
                <span className="text-sm font-bold text-gray-700 dark:text-gray-300">إجمالي قيمة المخزون الكلي</span>
                <span className="text-lg font-bold text-green-600 dark:text-green-400">
                  {fmt(stock.reduce((s,r)=>s+r.total_cost,0) + prodMovement.reduce((s,r)=>s+r.stock_value,0))} ج
                </span>
              </div>
            </div>
          )}
        </div>
    </>
  )
}
