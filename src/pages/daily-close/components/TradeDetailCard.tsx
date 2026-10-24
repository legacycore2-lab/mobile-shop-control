// src/pages/daily-close/components/TradeDetailCard.tsx
import { Smartphone, Package } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/Card'
import { fmt, fmtCurrency } from '@/lib/fmt'
import type { DailyClose } from '@/types/dailyClose'

interface Props {
  sales:     DailyClose['sales']
  purchases: DailyClose['purchases']
  showSales:     boolean
  showPurchases: boolean
}

const TH = 'text-right font-medium py-2 px-1'
const TR = 'border-b border-gray-100 dark:border-gray-800 last:border-0'

function Items({ names }: { names: string[] }) {
  return (
    <td className="py-2 px-1 text-gray-700 dark:text-gray-300 min-w-[120px]">
      {names.map((name, k) => <p key={k}>{name}</p>)}
    </td>
  )
}

export function TradeDetailCard({ sales, purchases, showSales, showPurchases }: Props) {
  return (
    <Card className="lg:col-span-2">
      <CardHeader title="تفاصيل البيع والشراء" subtitle="الفواتير والأصناف (أسعار البيع قبل الخصم)" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {showSales && (
          <section>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
              البيع • {sales.invoiceCount} فاتورة • {fmtCurrency(sales.revenue)}
            </h3>
            {sales.invoices.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">لا توجد مبيعات في هذا اليوم</p>
            ) : (
              <>
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
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800">
                        <th className={TH}>الفاتورة</th>
                        <th className={TH}>العميل</th>
                        <th className={TH}>الأصناف</th>
                        <th className={TH}>الإجمالي</th>
                        <th className={TH}>المتبقي</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sales.invoices.map(i => (
                        <tr key={i.id} className={TR}>
                          <td className="py-2 px-1 text-gray-900 dark:text-white whitespace-nowrap">{i.number}</td>
                          <td className="py-2 px-1 text-gray-700 dark:text-gray-300">{i.customerName ?? 'نقدي'}</td>
                          <Items names={i.items} />
                          <td className="py-2 px-1 text-gray-700 dark:text-gray-300 whitespace-nowrap">{fmtCurrency(i.total)}</td>
                          <td className="py-2 px-1 whitespace-nowrap font-medium text-amber-600 dark:text-amber-400">
                            {i.remaining > 0 ? fmtCurrency(i.remaining) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>
        )}

        {showPurchases && (
          <section>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
              الشراء • {purchases.invoiceCount} فاتورة • {fmtCurrency(purchases.total)}
            </h3>
            {purchases.invoices.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">لا توجد مشتريات في هذا اليوم</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800">
                      <th className={TH}>الفاتورة</th>
                      <th className={TH}>المورد</th>
                      <th className={TH}>الأصناف</th>
                      <th className={TH}>الإجمالي</th>
                      <th className={TH}>المتبقي</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchases.invoices.map(i => (
                      <tr key={i.id} className={TR}>
                        <td className="py-2 px-1 text-gray-900 dark:text-white whitespace-nowrap">{i.number}</td>
                        <td className="py-2 px-1 text-gray-700 dark:text-gray-300">{i.supplierName}</td>
                        <Items names={i.items} />
                        <td className="py-2 px-1 text-gray-700 dark:text-gray-300 whitespace-nowrap">{fmtCurrency(i.total)}</td>
                        <td className="py-2 px-1 whitespace-nowrap font-medium text-amber-600 dark:text-amber-400">
                          {i.total > i.paid ? fmtCurrency(i.total - i.paid) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </div>
    </Card>
  )
}
