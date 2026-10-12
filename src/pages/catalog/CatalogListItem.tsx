// src/pages/catalog/CatalogListItem.tsx
// عرض المنتج كسطر في قائمة: صورة صغيرة + الاسم والسعر والمواصفات + زر الإضافة
import { Smartphone, Package, Wrench, Plus, Check, Heart, GitCompareArrows } from 'lucide-react'
import { cn } from '@/lib/cn'
import { fmtPriceAr } from '@/lib/fmt'
import { ConditionBadge } from './ConditionBadge'
import { catalogService, type CatalogEntry, type CatalogGroup } from '@/services/catalog.service'

const GROUP_STYLE: Record<CatalogGroup, { icon: React.ElementType; label: string; tint: string; color: string }> = {
  device:     { icon: Smartphone, label: 'موبايل',    tint: 'bg-emerald-50 dark:bg-emerald-900/20', color: 'text-emerald-500' },
  accessory:  { icon: Package,    label: 'إكسسوار',   tint: 'bg-indigo-50 dark:bg-indigo-900/20',   color: 'text-blue-600 dark:text-blue-400' },
  spare_part: { icon: Wrench,     label: 'قطعة غيار', tint: 'bg-slate-100 dark:bg-gray-800',        color: 'text-slate-500' },
}

interface Props {
  entry:     CatalogEntry
  inCartQty: number
  installmentFrom: number | null
  onAdd:     () => void
  onOpen:    () => void
  favorite:  { active: boolean; onToggle: () => void }
  compare:   { active: boolean; disabled: boolean; onToggle: () => void } | null
}

export function CatalogListItem({ entry, inCartQty, installmentFrom, onAdd, onOpen, favorite, compare }: Props) {
  const g          = GROUP_STYLE[entry.group]
  const Icon       = g.icon
  const soldOut    = entry.maxQty < 1
  const reachedMax = inCartQty >= entry.maxQty

  return (
    <div className={cn(
      'bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl p-2.5 sm:p-3 flex items-stretch gap-3',
      soldOut && 'opacity-65',
    )}>
      <div onClick={onOpen}
        className={cn('relative w-24 sm:w-32 shrink-0 rounded-xl flex items-center justify-center cursor-pointer', soldOut ? 'bg-slate-100 dark:bg-gray-800' : g.tint)}>
        {entry.image
          ? <img src={entry.image} alt={entry.title} loading="lazy" className="max-h-24 sm:max-h-28 max-w-full object-contain p-2" />
          : <Icon size={36} strokeWidth={1.3} className={soldOut ? 'text-slate-400' : g.color} />}
        {entry.oldPrice !== null && !soldOut && (
          <span className="absolute top-1.5 right-1.5 text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-red-500 text-white">
            −{catalogService.discountPercent(entry.price, entry.oldPrice)}%
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
        <div onClick={onOpen} className="cursor-pointer">
          <p className="text-xs text-slate-500 dark:text-gray-400 flex items-center gap-2 mb-1">
            {entry.condition
              ? <ConditionBadge condition={entry.condition} />
              : <span>{entry.subtitle}</span>}
            <span className={cn('font-semibold', soldOut ? 'text-red-600' : 'text-emerald-600')}>
              {soldOut ? 'نفد' : 'متوفر'}
            </span>
          </p>
          <p className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white leading-snug">{entry.title}</p>
        </div>

        {entry.details.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {entry.details.map(d => (
              <span key={d} className="px-1.5 py-0.5 rounded-md text-[11px] sm:text-xs bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-gray-300">
                {d}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-end justify-between gap-2 mt-auto">
          <div>
            {entry.oldPrice !== null && (
              <p className="text-xs text-slate-400 line-through">{fmtPriceAr(entry.oldPrice)}</p>
            )}
            <p className="text-lg font-bold text-gray-900 dark:text-white leading-none">
              {fmtPriceAr(entry.price)}
            </p>
            {installmentFrom !== null && (
              <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 mt-1">
                قسّط من {fmtPriceAr(installmentFrom)} / شهر
              </p>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={favorite.onToggle} aria-label="المفضلة"
              className="w-9 h-9 rounded-full border border-slate-200 dark:border-gray-700 flex items-center justify-center">
              <Heart size={15} className={favorite.active ? 'fill-red-500 text-red-500' : 'text-slate-400'} />
            </button>
            {compare && (
              <button onClick={compare.onToggle} disabled={compare.disabled && !compare.active} aria-label="قارن"
                className={cn(
                  'w-9 h-9 rounded-full border flex items-center justify-center disabled:opacity-40',
                  compare.active ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 dark:border-gray-700 text-slate-500',
                )}>
                <GitCompareArrows size={15} />
              </button>
            )}
            <button onClick={onAdd} disabled={soldOut || reachedMax}
              className={cn(
                'h-9 px-3 rounded-[10px] text-sm font-semibold flex items-center gap-1.5 transition-colors disabled:cursor-not-allowed',
                soldOut
                  ? 'bg-slate-200 dark:bg-gray-800 text-slate-400'
                  : inCartQty > 0
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 disabled:opacity-80'
                    : 'bg-[#0F2552] hover:bg-[#0B1B3F] text-white',
              )}>
              {soldOut ? 'غير متاح' : inCartQty > 0 ? <><Check size={14} /> {inCartQty}</> : <><Plus size={14} /> أضف</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
