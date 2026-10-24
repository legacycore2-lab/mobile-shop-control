// src/pages/daily-close/components/PurchasesCard.tsx
import { Card, CardHeader } from '@/components/ui/Card'
import { fmtCurrency } from '@/lib/fmt'
import type { DailyClose } from '@/types/dailyClose'

interface Props {
  purchases: DailyClose['purchases']
}

export function PurchasesCard({ purchases }: Props) {
  return (
    <Card>
      <CardHeader
        title="المشتريات"
        subtitle={`${purchases.invoiceCount} فاتورة • الإجمالي ${fmtCurrency(purchases.total)} • المدفوع ${fmtCurrency(purchases.paid)}`}
      />
      {purchases.invoices.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">لا توجد مشتريات في هذا اليوم</p>
      ) : (
        <ul className="divide-y divide-gray-100 dark:divide-gray-800">
          {purchases.invoices.map(i => (
            <li key={i.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <div className="min-w-0">
                <p className="text-gray-900 dark:text-white truncate">{i.supplierName}</p>
                <p className="text-xs text-gray-400">{i.number}</p>
                {i.items.map((name, k) => <p key={k} className="text-xs text-gray-600 dark:text-gray-300">{name}</p>)}
              </div>
              <div className="text-left flex-shrink-0">
                <p className="font-medium text-gray-900 dark:text-white">{fmtCurrency(i.total)}</p>
                {i.total > i.paid && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">متبقي {fmtCurrency(i.total - i.paid)}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
