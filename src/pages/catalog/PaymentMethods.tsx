// src/pages/catalog/PaymentMethods.tsx
// شريط طرق الدفع تحت الواجهة الرئيسية (بيظهر منها المفعّل بس من إعدادات المحل)
import { Wallet } from 'lucide-react'
import { PaymentChips, activePaymentMethods } from './PaymentChips'
import type { StoreInfo } from '@/types/database'

export function PaymentMethods({ store }: { store: StoreInfo | null }) {
  const methods = activePaymentMethods(store)
  if (methods.length === 0) return null
  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-7 pt-6">
      <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl px-4 sm:px-6 py-4 flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-6">
        <p className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white shrink-0">
          <Wallet size={18} className="text-amber-500" /> طرق الدفع
        </p>
        <PaymentChips methods={methods} />
      </div>
    </section>
  )
}
