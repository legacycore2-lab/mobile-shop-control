// src/pages/daily-close/DailyClosePage.tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronRight, ChevronLeft, FileDown, Wallet, ShoppingCart, TrendingUp, Users, AlertCircle,
} from 'lucide-react'
import { useDailyClose } from '@/hooks/useDailyClose'
import { useNumberVisibility } from '@/hooks/usePermissions'
import { StatCard } from '@/components/shared/StatCard'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { exportDailyClosePdf } from '@/lib/pdfExport'
import { formatDateKeyAr, shiftDateKey, todayKey } from '@/lib/dateKey'
import { fmtCurrency } from '@/lib/fmt'
import { CashFlowCard } from './components/CashFlowCard'
import { ProfitCard } from './components/ProfitCard'
import { ExpensesCard } from './components/ExpensesCard'
import { DebtorsCard } from './components/DebtorsCard'
import { TradeDetailCard } from './components/TradeDetailCard'
import { CreditorsCard } from './components/CreditorsCard'

export function DailyClosePage() {
  const navigate = useNavigate()
  const [date, setDate] = useState(todayKey)
  const { data, isLoading, isError, refetch } = useDailyClose(date)

  const vis = useNumberVisibility()
  const canPdf = vis.revenue && vis.profit && vis.cost && vis.balances
  const isToday = date === todayKey()

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">إقفال اليوم</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{formatDateKeyAr(date)}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="secondary" icon={<ChevronRight size={14} />}
            onClick={() => setDate(d => shiftDateKey(d, -1))} aria-label="اليوم السابق" />
          <input
            type="date"
            value={date}
            max={todayKey()}
            onChange={e => e.target.value && setDate(e.target.value)}
            className="h-8 px-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
          <Button size="sm" variant="secondary" icon={<ChevronLeft size={14} />}
            disabled={isToday} onClick={() => setDate(d => shiftDateKey(d, 1))} aria-label="اليوم التالي" />
          {!isToday && (
            <Button size="sm" variant="ghost" onClick={() => setDate(todayKey())}>اليوم</Button>
          )}
          <Button size="sm" variant="primary" icon={<FileDown size={14} />}
            disabled={!data || !canPdf} onClick={() => data && exportDailyClosePdf(data, 'preview')}>
            PDF
          </Button>
        </div>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="h-[74px] rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
          ))}
        </div>
      )}

      {isError && (
        <Card>
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <AlertCircle size={28} className="text-red-500" />
            <p className="text-sm text-gray-600 dark:text-gray-300">تعذّر تحميل بيانات الإقفال</p>
            <Button size="sm" variant="secondary" onClick={() => void refetch()}>إعادة المحاولة</Button>
          </div>
        </Card>
      )}

      {data && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {vis.revenue && <StatCard label="صافي النقدية" value={fmtCurrency(data.cash.net)}
              sub={`داخل ${fmtCurrency(data.cash.totalIn)} • خارج ${fmtCurrency(data.cash.totalOut)}`}
              icon={Wallet} color={data.cash.net >= 0 ? 'green' : 'red'} />}
            {vis.revenue && <StatCard label="إجمالي المبيعات" value={fmtCurrency(data.sales.revenue)}
              sub={`${data.sales.invoiceCount} فاتورة`} icon={ShoppingCart} color="blue" />}
            {vis.profit && <StatCard label="صافي الربح" value={fmtCurrency(data.netProfit)}
              sub={`هامش ${data.sales.marginPct}%`} icon={TrendingUp} color={data.netProfit >= 0 ? 'teal' : 'red'} />}
            {vis.balances && <StatCard label="المتبقي عند العملاء" value={fmtCurrency(data.receivables.totalOutstanding)}
              sub={`${data.receivables.debtorCount} عميل`} icon={Users} color="amber"
              onClick={() => navigate('/ledger')} />}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {vis.revenue && <CashFlowCard cash={data.cash} />}
            {vis.profit && <ProfitCard sales={data.sales} expenses={data.expenses.total} netProfit={data.netProfit} />}
            {data.expenses.total > 0 && <ExpensesCard expenses={data.expenses} />}
            {vis.balances && data.receivables.debtorCount > 0 && <DebtorsCard receivables={data.receivables}
              onOpenCustomer={id => navigate(`/ledger/customer/${id}`)} />}
            {(vis.revenue || vis.cost) && (
              <TradeDetailCard sales={data.sales} purchases={data.purchases} showSales={vis.revenue} showPurchases={vis.cost} />
            )}
            {vis.balances && data.payables.creditorCount > 0 && <CreditorsCard payables={data.payables}
              onOpenSupplier={id => navigate(`/ledger/supplier/${id}`)} />}
          </div>
        </>
      )}
    </div>
  )
}
