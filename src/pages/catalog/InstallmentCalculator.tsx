// src/pages/catalog/InstallmentCalculator.tsx
import { useState } from 'react'
import { cn } from '@/lib/cn'
import { fmt } from '@/lib/fmt'
import { INSTALLMENT_MONTHS, installmentPlan } from '@/services/catalog.service'
import type { StoreInfo } from '@/types/database'

export function InstallmentCalculator({ price, store }: { price: number; store: StoreInfo }) {
  const [months, setMonths] = useState<number>(12)
  const plan = installmentPlan(price, months, store)

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-gray-800 p-4 space-y-3">
      <p className="text-sm font-semibold text-gray-900 dark:text-white">التقسيط</p>
      <div className="flex gap-2">
        {INSTALLMENT_MONTHS.map(m => (
          <button key={m} onClick={() => setMonths(m)}
            className={cn(
              'flex-1 h-9 rounded-lg text-sm border transition-colors',
              months === m
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white font-semibold'
                : 'border-slate-200 dark:border-gray-700 text-gray-700 dark:text-gray-300',
            )}>
            {m} شهر
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 text-center">
        <div className="rounded-xl bg-slate-50 dark:bg-gray-800 py-3">
          <p className="text-xs text-slate-500 dark:text-gray-400">المقدم</p>
          <p className="font-bold text-gray-900 dark:text-white">{fmt(plan.down)} ج</p>
        </div>
        <div className="rounded-xl bg-blue-50 dark:bg-blue-900/20 py-3">
          <p className="text-xs text-slate-500 dark:text-gray-400">القسط الشهري</p>
          <p className="font-bold text-blue-700 dark:text-blue-400">{fmt(plan.monthly)} ج</p>
        </div>
      </div>
      <p className="text-xs text-slate-500 dark:text-gray-400">حساب تقديري — الشروط النهائية بتتأكد معاك عند الاستلام.</p>
    </div>
  )
}
