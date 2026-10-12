// src/pages/catalog/CatalogHero.tsx
import { Smartphone, Truck, Tag } from 'lucide-react'

interface Props {
  onBrowse: () => void
  onHowTo:  () => void
}

export function CatalogHero({ onBrowse, onHowTo }: Props) {
  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-7 pt-5">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-l from-[#EEF1F7] to-[#E6EBF4] dark:from-gray-900 dark:to-gray-800 border border-slate-200/70 dark:border-gray-800 md:min-h-[370px] flex flex-col md:block">
        <div className="relative md:absolute md:inset-y-0 md:right-0 md:w-[48%] md:flex md:flex-col md:justify-center px-6 sm:px-10 pt-8 pb-6 md:py-0">
          <span className="inline-flex items-center gap-2 rounded-full bg-gradient-to-l from-amber-500 to-amber-600 text-white text-xs sm:text-sm font-bold px-4 py-1.5 mb-4 self-start">
            <Tag size={14} /> معرض الشافعي ستور
          </span>
          <h1 className="text-3xl sm:text-5xl font-extrabold leading-[1.3] text-[#0F2552] dark:text-white mb-3">
            أحدث الموبايلات<br />بأفضل الأسعار
          </h1>
          <p className="text-sm sm:text-lg leading-8 text-slate-600 dark:text-gray-300 mb-6 max-w-md">
            اختار موبايلك بسهولة، وقارن بين الموديلات، واطلب أونلاين بكل أمان.
          </p>
          <div className="flex flex-wrap gap-3">
            <button onClick={onBrowse}
              className="h-12 px-6 rounded-xl bg-[#0F2552] hover:bg-[#0B1B3F] text-white font-bold text-sm sm:text-base flex items-center gap-2.5 transition-colors">
              <Smartphone size={18} /> تصفّح الموبايلات
            </button>
            <button onClick={onHowTo}
              className="h-12 px-6 rounded-xl border border-amber-500 text-amber-700 dark:text-amber-400 font-bold text-sm sm:text-base flex items-center gap-2.5 hover:bg-amber-50 dark:hover:bg-amber-900/10 transition-colors">
              <Truck size={18} /> اعرف إزاي أطلب
            </button>
          </div>
        </div>

        <img
          src={`${import.meta.env.BASE_URL}catalog/hero-phones.png`}
          alt=""
          aria-hidden="true"
          className="w-full h-auto md:absolute md:inset-y-0 md:left-0 md:h-full md:w-[52%] md:object-cover md:object-left"
        />
      </div>
    </section>
  )
}
