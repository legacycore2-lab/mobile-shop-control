// src/pages/daily-close/components/SalesDetailCard.tsx
import { Smartphone, Package } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/Card'
import { fmt, fmtCurrency } from '@/lib/fmt'
import type { DailyClose } from '@/types/dailyClose'

interface Props {
  sales: DailyClose['sales']
}

export function SalesDetailCard({ sales }: Props) {
  return (
    <Card className="lg:col-span-2">
      <CardHeader title="تفاصيل المبيعات" subtitle="الفواتير والأصناف المباعة (الأسعار قبل الخصم)" />

      {sales.invoices.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">لا توجد مبيعات في هذا اليوم</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">الفواتير</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800">
                    <th className="text-right font-medium py-2 px-1">الفاتورة</th>
                    <th className="text-right font-medium py-2 px-1">العميل</th>
                    <th className="text-right font-medium py-2 px-1">الإجمالي</th>
                    <th className="text-right font-medium py-2 px-1">المتبقي</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.invoices.map(i => (
                    <tr key={i.id} className="border-b border-gray-100 dark:border-gray-800 last:border-0">
                      <td className="py-2 px-1 text-gray-900 dark:text-white whitespace-nowrap">{i.number}</td>
                      <td className="py-2 px-1 text-gray-700 dark:text-gray-300">{i.customerName ?? 'نقدي'}</td>
                      <td className="py-2 px-1 text-gray-700 dark:text-gray-300 whitespace-nowrap">{fmtCurrency(i.total)}</td>
                      <td className="py-2 px-1 whitespace-nowrap font-medium text-amber-600 dark:text-amber-400">
                        {i.remaining > 0 ? fmtCurrency(i.remaining) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-3">
                <div className="flex items-center gap-1.5 text-xs text-blue-700 dark:text-blue-400"><Smartphone size={14} /> أجهزة</div>
                <p className="text-sm font-bold text-blue-700 dark:text-blue-400 mt-1">
                  {fmt(sales.devices.quantity)} • {fmtCurrency(sales.devices.amount)}
                </p>
              </div>
              <div className="rounded-lg bg-purple-50 dark:bg-purple-900/20 p-3">
                <div className="flex items-center gap-1.5 text-xs text-purple-700 dark:text-purple-400"><Package size={14} /> إكسسوارات وقطع</div>
                <p className="text-sm font-bold text-purple-700 dark:text-purple-400 mt-1">
                  {fmt(sales.products.quantity)} • {fmtCurrency(sales.products.amount)}
                </p>
              </div>
            </div>
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {sales.items.map(it => (
                <li key={`${it.kind}:${it.name}`} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="text-gray-700 dark:text-gray-300 truncate">{it.name}</span>
                  <span className="text-gray-900 dark:text-white font-medium whitespace-nowrap">
                    {fmt(it.quantity)} × • {fmtCurrency(it.amount)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </Card>
  )
}
