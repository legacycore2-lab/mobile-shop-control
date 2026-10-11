// src/pages/catalog/PaymentMethods.tsx
// شريط طرق الدفع تحت الواجهة الرئيسية (بيظهر منها المفعّل بس من إعدادات المحل)
import { Banknote, Smartphone, Landmark, Wallet } from 'lucide-react'
import type { StoreInfo } from '@/types/database'

interface Method { key: string; icon: React.ElementType; title: string; sub: string | null }

function methodsOf(store: StoreInfo): Method[] {
  const list: Method[] = []
  if (store.pay_cash)
    list.push({ key: 'cash', icon: Banknote, title: 'كاش عند الاستلام', sub: null })
  if (store.vodafone_cash_number)
    list.push({ key: 'wallet', icon: Smartphone, title: 'فودافون كاش', sub: store.vodafone_cash_number })
  if (store.instapay_address)
    list.push({ key: 'instapay', icon: Landmark, title: 'إنستا باي', sub: store.instapay_address })
  return list
}

export function PaymentMethods({ store }: { store: StoreInfo | null }) {
  const methods = store ? methodsOf(store) : []
  if (methods.length === 0) return null
  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-7 pt-6">
      <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
        <p className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white shrink-0">
          <Wallet size={18} className="text-amber-500" /> طرق الدفع
        </p>
        <div className="flex flex-wrap gap-2.5">
          {methods.map(({ key, icon: Icon, title, sub }) => (
            <div key={key} className="h-10 px-3.5 rounded-full bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 flex items-center gap-2 text-sm">
              <Icon size={16} className="text-amber-600 dark:text-amber-400" />
              <span className="font-semibold text-gray-900 dark:text-white">{title}</span>
              {sub && <span dir="ltr" className="text-slate-600 dark:text-gray-300 tabular-nums">{sub}</span>}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
