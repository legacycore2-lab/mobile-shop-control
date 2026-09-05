// @ts-nocheck
// src/pages/reports/tabs/OverviewTab.tsx
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
export function OverviewTabContent(props: Record<string, any>) {
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
          {sumLoad ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {Array.from({length:8}).map((_,i)=><div key={i} className="h-24 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse"/>)}
            </div>
          ) : summary && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <KpiCard label="إجمالي الإيرادات"   value={`${fmt(summary.totalRevenue)} ج`}   icon={DollarSign}  color="green"  />
                <KpiCard label="إجمالي التكاليف"    value={`${fmt(summary.totalCostSold)} ج`}      icon={Package}     color="red"    />
                <KpiCard label="صافي الربح"         value={`${fmt(summary.totalProfit)} ج`}    icon={TrendingUp}  color={summary.totalProfit>=0?'green':'red'} />
                <KpiCard label="هامش الربح"         value={`${summary.avgMargin?.toFixed(1)}%`} icon={BarChart2}  color="blue"   />
                <KpiCard label="أجهزة مباعة"        value={fmt(summary.totalSoldDevices)}            icon={Smartphone}  color="teal"   />
                <KpiCard label="في المخزون"         value={fmt(summary.stockDevices)}         icon={Package}     color="blue"   />
                <KpiCard label="قيمة المخزون (تكلفة)" value={`${fmt(stock.reduce((s,r:(typeof stock)[0])=>s+r.total_cost,0))} ج`} icon={DollarSign} color="amber" />
                <KpiCard label="ربح متوقع من المخزون" value={`${fmt(stock.reduce((s,r:(typeof stock)[0])=>s+(r.total_selling-r.total_cost),0))} ج`} icon={TrendingUp} color="green" />
              </div>

              {/* Activity chart */}
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">نشاط الأجهزة — آخر 30 يوم</h3>
                {actLoad ? <div className="h-36 bg-gray-100 dark:bg-gray-800 rounded animate-pulse"/> : (
                  <BarChart data={activity as unknown as ({[key:string]:unknown})[]} valueKey="devices_sold" labelKey="date" color="green" height={140}/>
                )}
              </div>
            </>
          )}
        </div>
    </>
  )
}
