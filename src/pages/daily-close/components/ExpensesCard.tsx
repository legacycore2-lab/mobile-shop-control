// src/pages/daily-close/components/ExpensesCard.tsx
import { Card, CardHeader } from '@/components/ui/Card'
import { fmtCurrency } from '@/lib/fmt'
import type { DailyClose } from '@/types/dailyClose'

interface Props {
  expenses: DailyClose['expenses']
}

export function ExpensesCard({ expenses }: Props) {
  return (
    <Card>
      <CardHeader title="المصروفات" subtitle={`الإجمالي ${fmtCurrency(expenses.total)}`} />
      {expenses.byCategory.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">لا توجد مصروفات في هذا اليوم</p>
      ) : (
        <ul className="divide-y divide-gray-100 dark:divide-gray-800">
          {expenses.byCategory.map(c => (
            <li key={c.name} className="flex items-center justify-between py-2 text-sm">
              <span className="text-gray-700 dark:text-gray-300">{c.name}</span>
              <span className="font-medium text-gray-900 dark:text-white">{fmtCurrency(c.amount)}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
