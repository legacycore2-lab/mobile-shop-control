// @ts-nocheck
// src/pages/reports/tabs/AlertsTab.tsx
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
export function AlertsTabContent(props: Record<string, any>) {
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
            <KpiCard label="منتجات تحت الحد"    value={lowStock.length}                                                  icon={AlertTriangle} color="red"   />
            <KpiCard label="نفذ من المخزون"     value={lowStock.filter(r=>r.stock_qty===0).length}                      icon={Package}       color="red"   />
            <KpiCard label="تحت الحد الأدنى"   value={lowStock.filter(r=>r.stock_qty>0).length}                        icon={AlertTriangle} color="amber" />
            <KpiCard label="قيمة المخزون المنخفض" value={`${fmt(lowStock.reduce((s,r)=>s+r.stock_value,0))} ج`}       icon={DollarSign}    color="amber" />
          </div>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">منتجات تحتاج إعادة طلب</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                    {['#','المنتج','الفئة','الرصيد الحالي','الحد الأدنى','العجز','سعر التكلفة','قيمة المخزون'].map(h=>(
                      <th key={h} className="px-3 py-2.5 text-right text-xs font-bold text-gray-500 dark:text-gray-400 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {lowLoad ? <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-400">جاري التحميل...</td></tr>
                  : lowStock.map((r,i)=>(
                    <tr key={i} className="bg-amber-50/30 dark:bg-amber-900/5 hover:bg-amber-50/60 dark:hover:bg-amber-900/10">
                      <td className="px-3 py-2.5 text-xs text-gray-400">{i+1}</td>
                      <td className="px-3 py-2.5 font-semibold text-gray-900 dark:text-white">{r.product_name}</td>
                      <td className="px-3 py-2.5"><Badge variant="info">{r.category_name}</Badge></td>
                      <td className="px-3 py-2.5 text-center">
                        <Badge variant={r.stock_qty===0?'danger':'warning'}>{r.stock_qty}</Badge>
                      </td>
                      <td className="px-3 py-2.5 text-center text-gray-600 dark:text-gray-400">{r.reorder_level}</td>
                      <td className="px-3 py-2.5 text-center font-bold text-red-600 dark:text-red-400">
                        -{Math.max(0,r.reorder_level-r.stock_qty)}
                      </td>
                      <td className="px-3 py-2.5 text-gray-700 dark:text-gray-300">{fmt(r.cost_price)} ج</td>
                      <td className="px-3 py-2.5 text-amber-600 dark:text-amber-400">{fmt(r.stock_value)} ج</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
    </>
  )
}
