// src/pages/catalog/PaymentMethods.tsx
// قسم طرق الدفع المتاحة (بيظهر منها المفعّل بس من إعدادات المحل)
import { Banknote, Smartphone, Landmark } from 'lucide-react'
import type { StoreInfo } from '@/types/database'

interface Method { key: string; icon: React.ElementType; title: string; sub: string }

function methodsOf(store: StoreInfo): Method[] {
  const list: Method[] = []
  if (store.pay_cash)
    list.push({ key: 'cash', icon: Banknote, title: 'كاش عند الاستلام', sub: 'ادفع وانت بتستلم' })
  if (store.vodafone_cash_number)
    list.push({ key: 'wallet', icon: Smartphone, title: 'فودافون كاش / محفظة', sub: store.vodafone_cash_number })
  if (store.instapay_address)
    list.push({ key: 'instapay', icon: Landmark, title: 'إنستا باي', sub: store.instapay_address })
  return list
}

export function PaymentMethods({ store }: { store: StoreInfo | null }) {
  const methods = store ? methodsOf(store) : []
  if (methods.length === 0) return null
  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-7 pt-14">
      <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-7">طرق الدفع</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {methods.map(({ key, icon: Icon, title, sub }) => (
          <div key={key} className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-[20px] p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center shrink-0">
              <Icon size={24} className="text-amber-600 dark:text-amber-400" />
            </div>
            <div className="min-w-0">
              <p className="text-base font-semibold text-gray-900 dark:text-white">{title}</p>
              <p className="text-sm text-slate-500 dark:text-gray-400 truncate" dir="auto">{sub}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
