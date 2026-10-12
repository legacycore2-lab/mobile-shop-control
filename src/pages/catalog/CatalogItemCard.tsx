// src/pages/catalog/CatalogItemCard.tsx
import { Smartphone, Package, Wrench, ShoppingCart, Check, GitCompareArrows, Heart } from 'lucide-react'
import { cn } from '@/lib/cn'
import { fmtPriceAr } from '@/lib/fmt'
import { ConditionBadge } from './ConditionBadge'
import { catalogService, type CatalogEntry, type CatalogGroup } from '@/services/catalog.service'

const GROUP_ICON: Record<CatalogGroup, React.ElementType> = {
  device:     Smartphone,
  accessory:  Package,
  spare_part: Wrench,
}

interface Props {
  entry:           CatalogEntry
  inCartQty:       number
  installmentFrom: number | null
  onAdd:           () => void
  onOpen:          () => void
  favorite:        { active: boolean; onToggle: () => void }
  compare:         { active: boolean; disabled: boolean; onToggle: () => void } | null   // null = الصنف مش موبايل
}

export function CatalogItemCard({ entry, inCartQty, installmentFrom, onAdd, onOpen, favorite, compare }: Props) {
  const Icon       = GROUP_ICON[entry.group]
  const soldOut    = entry.maxQty < 1
  const reachedMax = inCartQty >= entry.maxQty
  const specLine   = entry.details.join('  |  ')

  return (
    <div className={cn(
      'bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl p-3 sm:p-4 flex flex-col gap-3 shadow-[0_2px_10px_rgba(15,37,82,.04)] hover:shadow-[0_8px_24px_rgba(15,37,82,.10)] transition-shadow',
      soldOut && 'opacity-70',
    )}>
      <div className="flex items-start justify-between min-h-7">
        <div className="flex flex-col items-start gap-1">
          {soldOut
            ? <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">نفد</span>
            : entry.condition && <ConditionBadge condition={entry.condition} />}
          {entry.oldPrice !== null && !soldOut && (
            <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-red-500 text-white">
              عرض −{catalogService.discountPercent(entry.price, entry.oldPrice)}%
            </span>
          )}
        </div>
        <button
          onClick={favorite.onToggle}
          aria-label="المفضلة"
          aria-pressed={favorite.active}
          className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-gray-800">
          <Heart size={17} className={favorite.active ? 'fill-red-500 text-red-500' : 'text-slate-400'} />
        </button>
      </div>

      <div onClick={onOpen} className="relative h-28 sm:h-36 flex items-center justify-center cursor-pointer">
        {entry.image
          ? <img src={entry.image} alt={entry.title} loading="lazy" className="max-h-full max-w-full object-contain" />
          : <Icon size={56} strokeWidth={1.2} className="text-slate-300 dark:text-gray-600" />}
        {compare && (
          <button
            onClick={e => { e.stopPropagation(); compare.onToggle() }}
            disabled={compare.disabled && !compare.active}
            className={cn(
              'absolute bottom-0 right-0 h-7 px-2.5 rounded-full text-[11px] font-semibold flex items-center gap-1.5 border transition-colors disabled:opacity-40 disabled:cursor-not-allowed',
              compare.active
                ? 'bg-[#0F2552] text-white border-[#0F2552]'
                : 'bg-white dark:bg-gray-900 text-slate-600 dark:text-gray-300 border-slate-200 dark:border-gray-700',
            )}>
            <GitCompareArrows size={13} /> {compare.active ? 'في المقارنة' : 'قارن'}
          </button>
        )}
      </div>

      <div onClick={onOpen} className="cursor-pointer text-center space-y-1">
        <p dir="auto" className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-snug">{entry.title}</p>
        {specLine
          ? <p dir="ltr" className="text-[11px] sm:text-xs text-slate-500 dark:text-gray-400 truncate">{specLine}</p>
          : <p className="text-xs text-slate-500 dark:text-gray-400">{entry.subtitle}</p>}
      </div>

      <div className="text-center mt-auto">
        {entry.oldPrice !== null && (
          <p className="text-xs text-slate-400 line-through">{fmtPriceAr(entry.oldPrice)}</p>
        )}
        <p className="text-lg sm:text-xl font-extrabold text-[#0F2552] dark:text-white">{fmtPriceAr(entry.price)}</p>
        {installmentFrom !== null && (
          <p className="text-[11px] sm:text-xs font-semibold text-emerald-700 dark:text-emerald-400 mt-0.5">
            قسّط من {fmtPriceAr(installmentFrom)} / شهر
          </p>
        )}
        {entry.kind === 'device' && entry.maxQty > 1 && (
          <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">متاح {entry.maxQty} قطع</p>
        )}
      </div>

      <button
        onClick={onAdd}
        disabled={soldOut || reachedMax}
        className={cn(
          'h-11 w-full rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors disabled:cursor-not-allowed',
          soldOut
            ? 'bg-slate-200 dark:bg-gray-800 text-slate-400'
            : inCartQty > 0
              ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 disabled:opacity-80'
              : 'bg-[#0F2552] hover:bg-[#0B1B3F] text-white',
        )}
      >
        {soldOut
          ? 'غير متاح'
          : inCartQty > 0
            ? <><Check size={16} /> في السلة ({inCartQty})</>
            : <><ShoppingCart size={16} /> أضف إلى السلة</>}
      </button>
    </div>
  )
}
