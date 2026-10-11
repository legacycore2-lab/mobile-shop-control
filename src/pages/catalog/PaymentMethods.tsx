// src/pages/catalog/PaymentMethods.tsx
// شريط طرق الدفع تحت الواجهة الرئيسية (بيظهر منها المفعّل بس من إعدادات المحل)
import { Banknote, Wallet } from 'lucide-react'
import type { StoreInfo } from '@/types/database'

interface Method { key: string; title: string; icon?: React.ElementType; logos?: string[] }

const WALLET_LOGOS  = ['vodafone', 'etisalat', 'orange', 'we', 'cash']
const INSTAPAY_LOGO = ['instapay']

function methodsOf(store: StoreInfo): Method[] {
  const list: Method[] = []
  if (store.pay_cash)
    list.push({ key: 'cash', title: 'كاش عند الاستلام', icon: Banknote })
  if (store.pay_vodafone_cash)
    list.push({ key: 'wallet', title: 'محافظ إلكترونية', logos: WALLET_LOGOS })
  if (store.pay_instapay)
    list.push({ key: 'instapay', title: 'إنستا باي', logos: INSTAPAY_LOGO })
  return list
}

const logoUrl = (name: string) => `${import.meta.env.BASE_URL}payments/${name}.png`

export function PaymentMethods({ store }: { store: StoreInfo | null }) {
  const methods = store ? methodsOf(store) : []
  if (methods.length === 0) return null
  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-7 pt-6">
      <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl px-4 sm:px-6 py-4 flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-6">
        <p className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white shrink-0">
          <Wallet size={18} className="text-amber-500" /> طرق الدفع
        </p>
        <div className="flex flex-wrap gap-2.5">
          {methods.map(({ key, title, icon: Icon, logos }) => (
            <div key={key} className="min-h-11 px-3.5 py-1.5 rounded-2xl bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 flex items-center gap-3 text-sm">
              {Icon && <Icon size={18} className="text-emerald-600 dark:text-emerald-400" />}
              <span className="font-semibold text-gray-900 dark:text-white">{title}</span>
              {logos && (
                <span className="flex items-center gap-2.5 bg-white rounded-xl px-2.5 py-1">
                  {logos.map(l => (
                    <img key={l} src={logoUrl(l)} alt={l} loading="lazy" className="h-6 w-auto object-contain" />
                  ))}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
