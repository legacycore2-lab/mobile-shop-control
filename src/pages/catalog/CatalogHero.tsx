// src/pages/catalog/CatalogHero.tsx
import { Smartphone, Truck, Tag } from 'lucide-react'

interface Props {
  onBrowse: () => void
  onHowTo:  () => void
}

export function CatalogHero({ onBrowse, onHowTo }: Props) {
  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-7 pt-5">
      {/* خلفية البانر بتطابق ألوان حواف الصورة عشان ما يبانش خط فاصل */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#F0F3F8] to-[#E9EDF3] dark:from-gray-900 dark:to-gray-800 border border-slate-200/70 dark:border-gray-800 xl:grid xl:grid-cols-[44%_56%]">
        <div className="flex flex-col justify-center px-6 sm:px-10 pt-8 pb-6 xl:py-6 xl:pl-4">
          <span className="inline-flex items-center gap-2 rounded-full bg-gradient-to-l from-amber-500 to-amber-600 text-white text-xs sm:text-sm font-bold px-4 py-1.5 mb-3 self-start">
            <Tag size={14} /> معرض الشافعي ستور
          </span>
          <h1 className="text-3xl sm:text-4xl xl:text-[42px] font-extrabold leading-[1.3] text-[#0F2552] dark:text-white mb-2.5">
            أحدث الموبايلات<br />بأفضل الأسعار
          </h1>
          <p className="text-sm sm:text-lg xl:text-base leading-7 sm:leading-8 xl:leading-7 text-slate-600 dark:text-gray-300 mb-5 max-w-md">
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

        <div className="relative aspect-[751/355] xl:aspect-auto xl:min-h-[300px]">
          <img
            src={`${import.meta.env.BASE_URL}catalog/hero-phones.png`}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-cover object-left"
          />
        </div>
      </div>
    </section>
  )
}
