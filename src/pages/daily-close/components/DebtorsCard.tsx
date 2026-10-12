// src/pages/daily-close/components/DebtorsCard.tsx
import { ChevronLeft } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/Card'
import { fmtCurrency } from '@/lib/fmt'
import type { DailyClose } from '@/types/dailyClose'

interface Props {
  receivables: DailyClose['receivables']
  onOpenCustomer: (customerId: string) => void
}

export function DebtorsCard({ receivables, onOpenCustomer }: Props) {
  return (
    <Card>
      <CardHeader
        title="المتبقي عند العملاء"
        subtitle={`${receivables.debtorCount} عميل • آجل جديد اليوم ${fmtCurrency(receivables.newToday)}`}
      />
      {receivables.topDebtors.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">لا يوجد متبقي عند أي عميل</p>
      ) : (
        <ul className="divide-y divide-gray-100 dark:divide-gray-800">
          {receivables.topDebtors.map(d => (
            <li key={d.customerId}>
              <button
                type="button"
                onClick={() => onOpenCustomer(d.customerId)}
                className="w-full flex items-center justify-between gap-3 py-2.5 text-right hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg px-1 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{d.name}</p>
                  {d.phone && <p className="text-xs text-gray-400 mt-0.5" dir="ltr">{d.phone}</p>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">{fmtCurrency(d.balance)}</span>
                  <ChevronLeft size={14} className="text-gray-400" />
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
