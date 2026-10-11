// src/pages/catalog/CatalogHero.tsx
import { BrandMark } from './BrandMark'
import type { BrandCount } from '@/services/catalog.service'

interface Props {
  brands:       BrandCount[]
  onPickBrand:  (brand: string) => void
  onBrowse:     () => void
  onHowTo:      () => void
}

export function CatalogHero({ brands, onPickBrand, onBrowse, onHowTo }: Props) {
  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-7 pt-8 sm:pt-10">
      <div className="relative overflow-hidden rounded-[28px] sm:rounded-[32px] bg-[#0F2A6B] px-6 py-10 sm:px-12 sm:py-14 flex flex-wrap items-center gap-10">
        <div className="absolute -left-24 -top-24 w-80 h-80 rounded-full bg-blue-600/35" />
        <div className="absolute left-28 -bottom-32 w-64 h-64 rounded-full bg-emerald-500/25" />

        <div className="relative flex-[1_1_380px] min-w-0">
          <span className="inline-block rounded-full bg-white/10 text-blue-100 text-xs sm:text-sm px-4 py-1.5 mb-5">
            معرض الشافعي ستور
          </span>
          <h1 className="text-3xl sm:text-5xl font-bold leading-[1.35] text-white mb-4">
            موبايلك وإكسسواراته<br />بأسعار واضحة وتوفر لحظي
          </h1>
          <p className="text-base sm:text-lg leading-8 text-blue-100/90 max-w-lg mb-7">
            اختار من البضاعة المتاحة وابعت طلبك أونلاين. هنتواصل معاك نأكّده.
          </p>
          <div className="flex flex-wrap gap-3">
            <button onClick={onBrowse} className="h-12 px-7 rounded-xl bg-white text-[#0F2A6B] font-bold text-base hover:bg-blue-50 transition-colors">
              تصفّح البضاعة
            </button>
            <button onClick={onHowTo} className="h-12 px-6 rounded-xl border border-white/35 text-white font-medium text-base hover:bg-white/10 transition-colors">
              إزاي أطلب
            </button>
          </div>
        </div>

        {brands.length > 0 && (
          <div className="relative flex-[1_1_300px] min-w-0 w-full max-w-md mx-auto">
            <p className="text-sm text-blue-100/90 mb-3">تصفّح حسب الماركة</p>
            <div className="grid grid-cols-2 gap-3">
              {brands.slice(0, 6).map(b => (
                <button
                  key={b.brand}
                  onClick={() => onPickBrand(b.brand)}
                  className="bg-white hover:bg-blue-50 rounded-[18px] px-4 py-3.5 flex items-center gap-3 text-right shadow-[0_16px_32px_rgba(6,18,60,.3)] transition-colors"
                >
                  <BrandMark brand={b.brand} size="md" />
                  <span className="min-w-0">
                    <span className="block font-semibold text-sm text-slate-900 truncate" dir="ltr">{b.brand}</span>
                    <span className="block text-xs text-slate-500">{b.count} متاح</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
