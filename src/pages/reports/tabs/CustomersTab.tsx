// @ts-nocheck
// src/pages/reports/tabs/CustomersTab.tsx
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
export function CustomersTabContent(props: Record<string, any>) {
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
            <KpiCard label="عدد العملاء"         value={customers.length}                                              icon={Users}      color="blue"  />
            <KpiCard label="إجمالي الأجهزة"      value={customers.reduce((s,r)=>s+r.device_count,0)}                 icon={Smartphone} color="teal"  />
            <KpiCard label="إجمالي المبيعات"     value={`${fmt(customers.reduce((s,r)=>s+r.total_spent,0))} ج`}     icon={DollarSign} color="green" />
            <KpiCard label="متوسط إنفاق العميل"  value={`${fmt(customers.length?customers.reduce((s,r)=>s+r.total_spent,0)/customers.length:0)} ج`} icon={TrendingUp} color="amber" />
          </div>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">أفضل العملاء</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                    {['#','العميل','أجهزة','إجمالي الإنفاق','متوسط الجهاز','النسبة'].map(h=>(
                      <th key={h} className="px-3 py-2.5 text-right text-xs font-bold text-gray-500 dark:text-gray-400 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {custLoad ? <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">جاري التحميل...</td></tr>
                  : customers.map((r,i)=>{
                    const total = customers.reduce((s,x)=>s+x.total_spent,0)
                    return (
                      <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                        <td className="px-3 py-2.5">
                          {i===0?<span className="text-amber-500 font-bold">🥇</span>
                          :i===1?<span className="text-gray-400 font-bold">🥈</span>
                          :i===2?<span className="text-amber-700 font-bold">🥉</span>
                          :<span className="text-xs text-gray-400">{i+1}</span>}
                        </td>
                        <td className="px-3 py-2.5 font-semibold text-gray-900 dark:text-white">{r.customer_name}</td>
                        <td className="px-3 py-2.5 text-center font-bold text-blue-600 dark:text-blue-400">{r.device_count}</td>
                        <td className="px-3 py-2.5 font-bold text-green-600 dark:text-green-400">{fmt(r.total_spent)} ج</td>
                        <td className="px-3 py-2.5 text-gray-700 dark:text-gray-300">{fmt(r.device_count>0?r.total_spent/r.device_count:0)} ج</td>
                        <td className="px-3 py-2.5 text-center">
                          <Badge variant="success">{total>0?((r.total_spent/total)*100).toFixed(1):0}%</Badge>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
    </>
  )
}
