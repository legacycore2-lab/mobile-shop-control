// src/pages/catalog/BrandStrip.tsx
// شريط شعارات الماركات تحت الهيدر — الضغط على ماركة بيفلتر عليها
import { getBrandLogo } from '@/lib/brandLogos'
import type { BrandCount } from '@/services/catalog.service'

interface Props {
  brands:      BrandCount[]
  onPickBrand: (brand: string) => void
}

export function BrandStrip({ brands, onPickBrand }: Props) {
  if (brands.length === 0) return null
  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-7 pt-5">
      <div className="flex gap-3 overflow-x-auto pb-1 md:grid md:grid-flow-col md:auto-cols-fr md:overflow-visible">
        {brands.map(b => {
          const logo = getBrandLogo(b.brand)
          return (
            <button
              key={b.brand}
              onClick={() => onPickBrand(b.brand)}
              aria-label={`${b.brand}، ${b.count} متاح`}
              className="flex-none w-32 md:w-auto md:min-w-0 h-14 rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-amber-400 hover:shadow-sm flex items-center justify-center px-4 transition-colors"
            >
              {logo
                ? <img src={logo} alt={b.brand} className="max-h-9 max-w-full object-contain" />
                : <span className="font-bold text-[#0F2552] dark:text-white text-sm" dir="ltr">{b.brand}</span>}
            </button>
          )
        })}
      </div>
    </section>
  )
}
