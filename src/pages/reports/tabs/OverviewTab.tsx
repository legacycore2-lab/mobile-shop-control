// src/pages/reports/tabs/OverviewTab.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
import { cn } from '@/lib/cn'
import { fmt } from '@/lib/fmt'
import { KpiCard, BarChart } from '../components/ReportWidgets'
import {
  Smartphone, Package, DollarSign, TrendingUp, BarChart2,
  AlertTriangle, Receipt,
} from 'lucide-react'

export function OverviewTabContent(props: Record<string, any>) {
  const {
    summary, sales, stock, activity,
    sumLoad, actLoad,
  } = props

  return (
    <>
      <div className="space-y-5">
        {sumLoad ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {Array.from({length:10}).map((_,i)=><div key={i} className="h-24 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse"/>)}
          </div>
        ) : summary && (
          <>
            {/* Row 1 — Revenue & Cost */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <KpiCard label="إجمالي الإيرادات"   value={`${fmt(summary.totalRevenue)} ج`}   icon={DollarSign}  color="green"  />
              <KpiCard label="تكلفة البضاعة المباعة"  value={`${fmt(summary.totalCostSold)} ج`}  icon={Package}     color="purple" />
              <KpiCard label="إجمالي المصروفات"   value={`${fmt(summary.totalExpenses ?? 0)} ج`} icon={Receipt}  color="red"    />
              <KpiCard
                label="صافي الربح"
                value={`${fmt(summary.netProfit ?? summary.totalProfit)} ج`}
                sub={`هامش صافي ${(summary.netMargin ?? 0).toFixed(1)}%`}
                icon={TrendingUp}
                color={(summary.netProfit ?? summary.totalProfit) >= 0 ? 'green' : 'red'}
              />
            </div>

            {/* Row 2 — Profit breakdown visual */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
              <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4">تفصيل الربحية</p>
              <div className="space-y-3">
                {/* Revenue bar */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-semibold text-gray-700 dark:text-gray-300">الإيرادات</span>
                    <span className="text-green-600 dark:text-green-400 font-bold">{fmt(summary.totalRevenue)} ج</span>
                  </div>
                  <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full w-full" />
                  </div>
                </div>
                {/* Cost bar */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-semibold text-gray-700 dark:text-gray-300">التكلفة</span>
                    <span className="text-purple-600 dark:text-purple-400 font-bold">− {fmt(summary.totalCostSold)} ج</span>
                  </div>
                  <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500 rounded-full" style={{ width: summary.totalRevenue > 0 ? `${(summary.totalCostSold / summary.totalRevenue) * 100}%` : '0%' }} />
                  </div>
                </div>
                {/* Expenses bar */}
                {(summary.totalExpenses ?? 0) > 0 && (
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-semibold text-gray-700 dark:text-gray-300">المصروفات</span>
                      <span className="text-red-600 dark:text-red-400 font-bold">− {fmt(summary.totalExpenses)} ج</span>
                    </div>
                    <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full bg-red-500 rounded-full" style={{ width: summary.totalRevenue > 0 ? `${(summary.totalExpenses / summary.totalRevenue) * 100}%` : '0%' }} />
                    </div>
                  </div>
                )}
                {/* Net profit result */}
                <div className={cn(
                  'rounded-xl border p-3 flex items-center justify-between mt-2',
                  (summary.netProfit ?? summary.totalProfit) >= 0
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                    : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
                )}>
                  <span className={cn('text-sm font-bold', (summary.netProfit ?? summary.totalProfit) >= 0 ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300')}>
                    صافي الربح النهائي
                  </span>
                  <span className="text-lg font-bold text-gray-900 dark:text-white">
                    {fmt(Math.abs(summary.netProfit ?? summary.totalProfit))} ج
                  </span>
                </div>
              </div>
            </div>

            {/* Row 3 — Devices & Stock */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <KpiCard label="هامش الربح الإجمالي"   value={`${(summary.avgMargin ?? 0).toFixed(1)}%`} icon={BarChart2}  color="blue"  />
              <KpiCard label="أجهزة مباعة"            value={fmt(summary.totalSoldDevices)}              icon={Smartphone} color="teal"  />
              <KpiCard label="في المخزون"             value={fmt(summary.stockDevices)}                  icon={Package}    color="blue"  />
              <KpiCard label="تنبيهات مخزون"          value={summary.lowStockCount}                      icon={AlertTriangle} color={summary.lowStockCount > 0 ? 'red' : 'green'} />
            </div>

            {/* Activity chart */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">نشاط الأجهزة — آخر 30 يوf</h3>
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
