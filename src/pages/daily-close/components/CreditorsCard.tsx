// src/pages/daily-close/components/CreditorsCard.tsx
import { ChevronLeft } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/Card'
import { fmtCurrency } from '@/lib/fmt'
import type { DailyClose } from '@/types/dailyClose'

interface Props {
  payables: DailyClose['payables']
  onOpenSupplier: (supplierId: string) => void
}

export function CreditorsCard({ payables, onOpenSupplier }: Props) {
  return (
    <Card>
      <CardHeader
        title="المستحق للموردين"
        subtitle={`${payables.creditorCount} مورد • الإجمالي ${fmtCurrency(payables.totalOutstanding)}`}
      />
      {payables.topCreditors.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">لا يوجد مستحق لأي مورد</p>
      ) : (
        <ul className="divide-y divide-gray-100 dark:divide-gray-800">
          {payables.topCreditors.map(c => (
            <li key={c.supplierId}>
              <button
                type="button"
                onClick={() => onOpenSupplier(c.supplierId)}
                className="w-full flex items-center justify-between gap-3 py-2.5 text-right hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg px-1 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{c.name}</p>
                  {c.phone && <p className="text-xs text-gray-400 mt-0.5" dir="ltr">{c.phone}</p>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-sm font-semibold text-red-600 dark:text-red-400">{fmtCurrency(c.balance)}</span>
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
