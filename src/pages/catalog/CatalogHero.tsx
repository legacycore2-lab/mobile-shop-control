// src/pages/catalog/CatalogHero.tsx
import { Smartphone, Package, Wrench } from 'lucide-react'
import { fmt } from '@/lib/fmt'
import type { CatalogEntry, CatalogGroup } from '@/services/catalog.service'

const ICONS: Record<CatalogGroup, React.ElementType> = {
  device:     Smartphone,
  accessory:  Package,
  spare_part: Wrench,
}

interface Props {
  availableCount: number
  featured:       CatalogEntry[]
  onBrowse:       () => void
  onHowTo:        () => void
}

export function CatalogHero({ availableCount, featured, onBrowse, onHowTo }: Props) {
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
            {availableCount > 0 && <> متاح دلوقتي <b className="text-white">{availableCount}</b> صنف.</>}
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

        {featured.length > 0 && (
          <div className="relative flex-[1_1_280px] min-w-0 flex flex-col gap-3.5 max-w-sm w-full mx-auto">
            {featured.map((e, i) => {
              const Icon = ICONS[e.group]
              return (
                <div key={e.key}
                  className={`bg-white rounded-[20px] px-5 py-4 flex items-center gap-3.5 shadow-[0_20px_40px_rgba(6,18,60,.35)] ${i % 2 === 1 ? 'sm:mr-7' : ''}`}>
                  <div className="w-12 h-12 rounded-[14px] bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <Icon size={24} className="text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-slate-900 truncate">{e.title}</p>
                    <p className="text-xs text-slate-500">متوفر</p>
                  </div>
                  <p className="font-bold text-lg text-slate-900">{fmt(e.price)} ج</p>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
