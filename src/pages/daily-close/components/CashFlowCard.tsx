// src/pages/daily-close/components/CashFlowCard.tsx
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/Card'
import { CASH_METHOD_LABELS } from '@/constants/paymentMethods'
import { cn } from '@/lib/cn'
import { fmtCurrency } from '@/lib/fmt'
import type { DailyClose } from '@/types/dailyClose'

interface Props {
  cash: DailyClose['cash']
}

function Line({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="text-gray-500 dark:text-gray-400">{label}</span>
      <span className="font-medium text-gray-900 dark:text-white">{fmtCurrency(value)}</span>
    </div>
  )
}

export function CashFlowCard({ cash }: Props) {
  return (
    <Card>
      <CardHeader title="حركة النقدية" subtitle="الداخل والخارج حسب وسيلة الدفع" />

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-lg bg-green-50 dark:bg-green-900/20 p-3">
          <div className="flex items-center gap-1.5 text-xs text-green-700 dark:text-green-400">
            <ArrowDownLeft size={14} /> داخل
          </div>
          <p className="text-lg font-bold text-green-700 dark:text-green-400 mt-1">{fmtCurrency(cash.totalIn)}</p>
        </div>
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-3">
          <div className="flex items-center gap-1.5 text-xs text-red-700 dark:text-red-400">
            <ArrowUpRight size={14} /> خارج
          </div>
          <p className="text-lg font-bold text-red-700 dark:text-red-400 mt-1">{fmtCurrency(cash.totalOut)}</p>
        </div>
      </div>

      {cash.byMethod.length > 0 ? (
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800">
                <th className="text-right font-medium py-2 px-1">الوسيلة</th>
                <th className="text-right font-medium py-2 px-1">داخل</th>
                <th className="text-right font-medium py-2 px-1">خارج</th>
                <th className="text-right font-medium py-2 px-1">الصافي</th>
              </tr>
            </thead>
            <tbody>
              {cash.byMethod.map(r => (
                <tr key={r.method} className="border-b border-gray-100 dark:border-gray-800 last:border-0">
                  <td className="py-2 px-1 text-gray-900 dark:text-white">{CASH_METHOD_LABELS[r.method]}</td>
                  <td className="py-2 px-1 text-gray-700 dark:text-gray-300">{fmtCurrency(r.cashIn)}</td>
                  <td className="py-2 px-1 text-gray-700 dark:text-gray-300">{fmtCurrency(r.cashOut)}</td>
                  <td className={cn('py-2 px-1 font-semibold', r.net >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>
                    {fmtCurrency(r.net)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-gray-400 text-center py-4">لا توجد حركة نقدية في هذا اليوم</p>
      )}

      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
        <Line label="محصّل من مبيعات اليوم"  value={cash.fromTodaySales} />
        <Line label="محصّل من فواتير سابقة"  value={cash.fromOlderInvoices} />
        <Line label="مدفوع للموردين"         value={cash.toSuppliers} />
        <Line label="مصروفات"                value={cash.expenses} />
      </div>
    </Card>
  )
}
