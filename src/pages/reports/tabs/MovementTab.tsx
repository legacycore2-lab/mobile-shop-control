// @ts-nocheck
// src/pages/reports/tabs/MovementTab.tsx
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
export function MovementTabContent(props: Record<string, any>) {
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
          {/* Controls */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 flex flex-wrap items-center gap-3">
            <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              {([['products','منتجات',Tag],['devices','أجهزة',Smartphone]] as const).map(([v,l,Icon])=>(
                <button key={v} onClick={()=>setMovType(v)}
                  className={cn('flex items-center gap-1.5 h-7 px-3 text-xs font-medium rounded-md transition-all',
                    movType===v?'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm':'text-gray-500 dark:text-gray-400')}>
                  <Icon size={12}/>{l}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar size={14} className="text-gray-400"/>
              <input type="date" value={movFrom} onChange={e=>setMovFrom(e.target.value)}
                className="h-8 px-2 border border-gray-200 dark:border-gray-700 rounded-lg text-xs bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"/>
              <span className="text-gray-400 text-xs">إلى</span>
              <input type="date" value={movTo} onChange={e=>setMovTo(e.target.value)}
                className="h-8 px-2 border border-gray-200 dark:border-gray-700 rounded-lg text-xs bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"/>
            </div>
            <button onClick={()=>{void refetchProd();void refetchDev()}}
              className="h-8 px-3 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 transition-colors flex items-center gap-1.5">
              <RefreshCw size={12}/> تحديث
            </button>
            <button onClick={exportMovementCsv}
              className="h-8 px-3 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 transition-colors flex items-center gap-1.5">
              <Download size={12}/> Excel
            </button>
          </div>

          {/* Products SOH */}
          {(
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">حركة المنتجات — SOH</h3>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>القيمة الإجمالية: <strong className="text-amber-600">{fmt(prodMovement.reduce((s,r)=>s+r.stock_value,0))} ج</strong></span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                      {['#','المنتج','الفئة','وحدة','رصيد أول الفترة','مشتريات','مبيعات','رصيد حالي','قيمة المخزون','الحالة'].map(h=>(
                        <th key={h} className="px-3 py-2.5 text-right text-xs font-bold text-gray-500 dark:text-gray-400 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {prodMovLoad ? <tr><td colSpan={10} className="px-4 py-8 text-center text-sm text-gray-400">جاري التحميل...</td></tr>
                    : prodMovement.length===0 ? <tr><td colSpan={10} className="px-4 py-8 text-center text-sm text-gray-400">لا توجد بيانات</td></tr>
                    : prodMovement.map((r,i)=>(
                      <tr key={i} className={cn('hover:bg-gray-50 dark:hover:bg-gray-800/30',r.needs_reorder&&'bg-red-50/20 dark:bg-red-900/5')}>
                        <td className="px-3 py-2.5 text-xs text-gray-400">{i+1}</td>
                        <td className="px-3 py-2.5 font-semibold text-gray-900 dark:text-white">
                          {r.name}{r.sku&&<span className="text-xs text-gray-400 dark:text-gray-600 mr-1">#{r.sku}</span>}
                        </td>
                        <td className="px-3 py-2.5"><Badge variant="info">{r.category_name}</Badge></td>
                        <td className="px-3 py-2.5 text-xs text-gray-500">{r.unit}</td>
                        <td className="px-3 py-2.5 text-center text-gray-600 dark:text-gray-400">{r.opening_stock}</td>
                        <td className="px-3 py-2.5 text-center font-bold text-blue-600 dark:text-blue-400">+{r.purchased}</td>
                        <td className="px-3 py-2.5 text-center font-bold text-green-600 dark:text-green-400">-{r.sold}</td>
                        <td className="px-3 py-2.5 text-center font-bold text-gray-900 dark:text-white">{r.current_stock}</td>
                        <td className="px-3 py-2.5 text-amber-600 dark:text-amber-400">{fmt(r.stock_value)} ج</td>
                        <td className="px-3 py-2.5">
                          <Badge variant={r.needs_reorder?'danger':'success'}>{r.needs_reorder?'يحتاج طلب':'كافٍ'}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {prodMovement.length>0&&<tfoot>
                    <tr className="bg-blue-50 dark:bg-blue-900/10 border-t-2 border-blue-200 dark:border-blue-800">
                      <td className="px-3 py-2.5 text-xs font-bold text-blue-700 dark:text-blue-400" colSpan={4}>الإجمالي</td>
                      <td className="px-3 py-2.5 text-center font-bold text-gray-900 dark:text-white">{prodMovement.reduce((s,r)=>s+r.opening_stock,0)}</td>
                      <td className="px-3 py-2.5 text-center font-bold text-blue-600">+{prodMovement.reduce((s,r)=>s+r.purchased,0)}</td>
                      <td className="px-3 py-2.5 text-center font-bold text-green-600">-{prodMovement.reduce((s,r)=>s+r.sold,0)}</td>
                      <td className="px-3 py-2.5 text-center font-bold text-gray-900 dark:text-white">{prodMovement.reduce((s,r)=>s+r.current_stock,0)}</td>
                      <td className="px-3 py-2.5 font-bold text-amber-600">{fmt(prodMovement.reduce((s,r)=>s+r.stock_value,0))} ج</td>
                      <td/>
                    </tr>
                  </tfoot>}
                </table>
              </div>
            </div>
          )}

          {/* Devices SOH */}
          {(
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">حركة الأجهزة — SOH</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                      {['#','الماركة','الموديل','إجمالي','في المخزون','اشتريت','بيعت','الإيرادات','الربح'].map(h=>(
                        <th key={h} className="px-3 py-2.5 text-right text-xs font-bold text-gray-500 dark:text-gray-400 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {devMovLoad ? <tr><td colSpan={9} className="px-4 py-8 text-center text-sm text-gray-400">جاري التحميل...</td></tr>
                    : devMovement.length===0 ? <tr><td colSpan={9} className="px-4 py-8 text-center text-sm text-gray-400">لا توجد بيانات</td></tr>
                    : devMovement.map((r,i)=>(
                      <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                        <td className="px-3 py-2.5 text-xs text-gray-400">{i+1}</td>
                        <td className="px-3 py-2.5 font-semibold text-gray-900 dark:text-white">{r.brand_name}</td>
                        <td className="px-3 py-2.5 text-gray-700 dark:text-gray-300">{r.model_name}</td>
                        <td className="px-3 py-2.5 text-center text-gray-600 dark:text-gray-400">{r.total}</td>
                        <td className="px-3 py-2.5 text-center font-bold text-blue-600 dark:text-blue-400">{r.in_stock}</td>
                        <td className="px-3 py-2.5 text-center font-bold text-blue-600 dark:text-blue-400">+{r.purchased_in_period}</td>
                        <td className="px-3 py-2.5 text-center font-bold text-green-600 dark:text-green-400">-{r.sold_in_period}</td>
                        <td className="px-3 py-2.5 text-green-600 dark:text-green-400 font-semibold">{fmt(r.total_revenue)} ج</td>
                        <td className={cn('px-3 py-2.5 font-bold',r.total_profit>=0?'text-green-600 dark:text-green-400':'text-red-600 dark:text-red-400')}>
                          {fmt(r.total_profit)} ج
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {devMovement.length>0&&<tfoot>
                    <tr className="bg-blue-50 dark:bg-blue-900/10 border-t-2 border-blue-200 dark:border-blue-800">
                      <td className="px-3 py-2.5 text-xs font-bold text-blue-700 dark:text-blue-400" colSpan={3}>الإجمالي</td>
                      <td className="px-3 py-2.5 text-center font-bold text-gray-900 dark:text-white">{devMovement.reduce((s,r)=>s+r.total,0)}</td>
                      <td className="px-3 py-2.5 text-center font-bold text-blue-600">{devMovement.reduce((s,r)=>s+r.in_stock,0)}</td>
                      <td className="px-3 py-2.5 text-center font-bold text-blue-600">+{devMovement.reduce((s,r)=>s+r.purchased_in_period,0)}</td>
                      <td className="px-3 py-2.5 text-center font-bold text-green-600">-{devMovement.reduce((s,r)=>s+r.sold_in_period,0)}</td>
                      <td className="px-3 py-2.5 font-bold text-green-600">{fmt(devMovement.reduce((s,r)=>s+r.total_revenue,0))} ج</td>
                      <td className="px-3 py-2.5 font-bold text-green-600">{fmt(devMovement.reduce((s,r)=>s+r.total_profit,0))} ج</td>
                    </tr>
                  </tfoot>}
                </table>
              </div>
            </div>
          )}
        </div>
    </>
  )
}
