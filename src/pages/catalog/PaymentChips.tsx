// src/pages/catalog/PaymentChips.tsx
// شارات طرق الدفع المفعّلة (اسم + لوجوهات) — بتتستخدم في شريط الصفحة الرئيسية وفي سلة الطلب
import type { StoreInfo } from '@/types/database'

interface Method { key: string; title: string; logos: string[] }

const WALLET_LOGOS  = ['vodafone', 'etisalat', 'orange', 'we']
const CASH_LOGO     = ['cash']
const INSTAPAY_LOGO = ['instapay']

export function activePaymentMethods(store: StoreInfo | null): Method[] {
  if (!store) return []
  const list: Method[] = []
  if (store.pay_cash)          list.push({ key: 'cash',     title: 'كاش عند الاستلام', logos: CASH_LOGO })
  if (store.pay_vodafone_cash) list.push({ key: 'wallet',   title: 'محافظ إلكترونية',  logos: WALLET_LOGOS })
  if (store.pay_instapay)      list.push({ key: 'instapay', title: 'إنستا باي',        logos: INSTAPAY_LOGO })
  return list
}

const logoUrl = (name: string) => `${import.meta.env.BASE_URL}payments/${name}.png`

export function PaymentChips({ methods }: { methods: Method[] }) {
  return (
    <div className="flex flex-wrap gap-2.5">
      {methods.map(({ key, title, logos }) => (
        <div key={key} className="min-h-11 px-3.5 py-1.5 rounded-2xl bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 flex items-center gap-3 text-sm">
          <span className="font-semibold text-gray-900 dark:text-white">{title}</span>
          <span className="flex items-center gap-2.5 bg-white rounded-xl px-2.5 py-1">
            {logos.map(l => (
              <img key={l} src={logoUrl(l)} alt={l} loading="lazy" className="h-6 w-auto object-contain" />
            ))}
          </span>
        </div>
      ))}
    </div>
  )
}
