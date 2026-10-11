// src/pages/catalog/CatalogInfo.tsx
// أسفل الصفحة: مميزات + إزاي أطلب + فوتر
import { CircleDollarSign, RefreshCw, PhoneCall, MapPin, Clock, Phone } from 'lucide-react'
import type { StoreInfo } from '@/types/database'

const TRUST: { icon: React.ElementType; title: string; sub: string }[] = [
  { icon: CircleDollarSign, title: 'أسعار واضحة',     sub: 'من غير مفاجآت'        },
  { icon: RefreshCw,        title: 'توفر لحظي',       sub: 'بيتحدّث مع كل بيعة'   },
  { icon: PhoneCall,        title: 'تأكيد بالتليفون', sub: 'بنكلمك قبل التجهيز'   },
]

const STEPS: { title: string; sub: string }[] = [
  { title: 'أضف للسلة',      sub: 'اختار المنتجات اللي محتاجها.'   },
  { title: 'اكتب بياناتك',   sub: 'الاسم ورقم الموبايل بس.'       },
  { title: 'استنى مكالمتنا', sub: 'بنأكّد معاك ونجهّز الطلب.'     },
]

export function CatalogInfo({ store }: { store: StoreInfo | null }) {
  const hasContact = !!store && !!(store.address || store.phone || store.working_hours)
  return (
    <>
      <section className="max-w-6xl mx-auto px-4 sm:px-7 pt-11">
        <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-3xl px-6 sm:px-8 py-7 grid grid-cols-1 sm:grid-cols-3 gap-6">
          {TRUST.map(({ icon: Icon, title, sub }) => (
            <div key={title} className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
                <Icon size={22} className="text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="font-semibold text-base text-gray-900 dark:text-white">{title}</p>
                <p className="text-xs text-slate-500 dark:text-gray-400">{sub}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="how" className="max-w-6xl mx-auto px-4 sm:px-7 pt-14 pb-16">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-7">إزاي أطلب؟</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {STEPS.map((s, i) => (
            <div key={s.title} className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-[20px] p-6">
              <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center mb-3.5">{i + 1}</div>
              <p className="text-lg font-semibold text-gray-900 dark:text-white mb-1.5">{s.title}</p>
              <p className="text-sm leading-7 text-slate-500 dark:text-gray-400">{s.sub}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="bg-slate-900 text-slate-300">
        <div className="max-w-6xl mx-auto px-4 sm:px-7 py-8 space-y-4">
          <p className="text-base font-bold text-white">الشافعي ستور</p>
          {hasContact && store && (
            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-x-8 gap-y-3 text-sm">
              {store.address && (
                <p className="flex items-center gap-2"><MapPin size={15} className="text-slate-400" />
                  {store.map_url
                    ? <a href={store.map_url} target="_blank" rel="noreferrer" className="underline underline-offset-4">{store.address}</a>
                    : store.address}
                </p>
              )}
              {store.phone && (
                <p className="flex items-center gap-2"><Phone size={15} className="text-slate-400" />
                  <a href={`tel:${store.phone}`} dir="ltr">{store.phone}</a>
                </p>
              )}
              {store.working_hours && (
                <p className="flex items-center gap-2"><Clock size={15} className="text-slate-400" />{store.working_hours}</p>
              )}
            </div>
          )}
        </div>
      </footer>
    </>
  )
}
