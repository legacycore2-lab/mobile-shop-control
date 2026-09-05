// @ts-nocheck
// src/pages/reports/tabs/SuppliersTab.tsx
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
export function SuppliersTabContent(props: Record<string, any>) {
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
          {/* Supplier selector */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 flex-1">
              <Truck size={14} className="text-gray-400 flex-shrink-0" />
              <select
                value={selectedSupplierId}
                onChange={e => setSelectedSupplierId(e.target.value)}
                className="flex-1 h-9 px-3 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 transition-all cursor-pointer">
                <option value="all">كل الموردين</option>
                {supplierLedger.map(s => (
                  <option key={s.supplier_id} value={s.supplier_id}>{s.supplier_name}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const ledger = selectedSupplierId === 'all' ? supplierLedger : supplierLedger.filter(s => s.supplier_id === selectedSupplierId)
                  const supps  = selectedSupplierId === 'all' ? suppliers : suppliers.filter((s: {supplier_name:string}) => ledger.some(l => l.supplier_name === s.supplier_name))
                  void printSuppliers(supps, ledger)
                }}
                className="h-9 px-4 text-sm font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors flex items-center gap-2 whitespace-nowrap">
                <Printer size={13} />
                {selectedSupplierId === 'all' ? 'طباعة الكل' : `طباعة ${supplierLedger.find(s=>s.supplier_id===selectedSupplierId)?.supplier_name ?? ''}`}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <KpiCard label="عدد الموردين"       value={suppliers.length}                                          icon={Truck}      color="blue"  />
            <KpiCard label="إجمالي الأجهزة"     value={suppliers.reduce((s,r)=>s+r.total_devices,0)}            icon={Smartphone} color="teal"  />
            <KpiCard label="إجمالي المشتريات"   value={`${fmt(suppliers.reduce((s,r)=>s+r.total_cost,0))} ج`}  icon={DollarSign} color="red"   />
          </div>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">إجمالي المشتريات حسب المورد</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                    {['#','المورد','عدد الأجهزة','إجمالي التكلفة','النسبة','متوسط سعر الجهاز'].map(h=>(
                      <th key={h} className="px-3 py-2.5 text-right text-xs font-bold text-gray-500 dark:text-gray-400 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {supLoad ? <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">جاري التحميل...</td></tr>
                  : suppliers.map((r,i)=>{
                    const total = suppliers.reduce((s,x)=>s+x.total_cost,0)
                    return (
                      <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                        <td className="px-3 py-2.5 text-xs text-gray-400">{i+1}</td>
                        <td className="px-3 py-2.5 font-semibold text-gray-900 dark:text-white">{r.supplier_name}</td>
                        <td className="px-3 py-2.5 text-center font-bold text-blue-600 dark:text-blue-400">{r.total_devices}</td>
                        <td className="px-3 py-2.5 font-semibold text-red-600 dark:text-red-400">{fmt(r.total_cost)} ج</td>
                        <td className="px-3 py-2.5 text-center">
                          <Badge variant="info">{total>0?((r.total_cost/total)*100).toFixed(1):0}%</Badge>
                        </td>
                        <td className="px-3 py-2.5 text-gray-700 dark:text-gray-300">
                          {fmt(r.total_devices>0?r.total_cost/r.total_devices:0)} ج
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
          {/* Bar chart */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">مقارنة الموردين</h3>
            <BarChart data={suppliers as unknown as ({[key:string]:unknown})[]} valueKey="total_cost" labelKey="supplier_name" color="red" height={140}/>
          </div>
        </div>
    </>
  )
}
