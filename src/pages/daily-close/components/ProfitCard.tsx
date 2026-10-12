// src/pages/daily-close/components/ProfitCard.tsx
import { Card, CardHeader } from '@/components/ui/Card'
import { cn } from '@/lib/cn'
import { fmtCurrency } from '@/lib/fmt'
import type { DailyClose } from '@/types/dailyClose'

interface Props {
  sales:     DailyClose['sales']
  expenses:  number
  netProfit: number
}

function Row({ label, value, strong, tone }: { label: string; value: string; strong?: boolean; tone?: 'good' | 'bad' }) {
  return (
    <div className="flex items-center justify-between py-2 text-sm">
      <span className={cn('text-gray-500 dark:text-gray-400', strong && 'font-semibold text-gray-900 dark:text-white')}>{label}</span>
      <span className={cn(
        'font-medium text-gray-900 dark:text-white',
        strong && 'font-bold text-base',
        tone === 'good' && 'text-green-600 dark:text-green-400',
        tone === 'bad'  && 'text-red-600 dark:text-red-400',
      )}>{value}</span>
    </div>
  )
}

export function ProfitCard({ sales, expenses, netProfit }: Props) {
  return (
    <Card>
      <CardHeader title="المبيعات والأرباح" subtitle={`${sales.invoiceCount} فاتورة بيع`} />
      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        <Row label="إجمالي المبيعات (بعد الخصم)" value={fmtCurrency(sales.revenue)} />
        <Row label="الخصومات"                    value={fmtCurrency(sales.discount)} />
        <Row label="تكلفة البضاعة المباعة"       value={fmtCurrency(sales.costOfGoods)} />
        <Row label={`مجمل الربح (${sales.marginPct}%)`} value={fmtCurrency(sales.grossProfit)} />
        <Row label="المصروفات"                   value={fmtCurrency(expenses)} />
        <Row label="صافي الربح" value={fmtCurrency(netProfit)} strong tone={netProfit >= 0 ? 'good' : 'bad'} />
      </div>
    </Card>
  )
}
