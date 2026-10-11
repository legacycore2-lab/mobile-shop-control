// src/pages/catalog/CatalogItemCard.tsx
import { Smartphone, Package, Wrench, Plus, Check, GitCompareArrows } from 'lucide-react'
import { cn } from '@/lib/cn'
import { fmt } from '@/lib/fmt'
import type { CatalogEntry, CatalogGroup } from '@/services/catalog.service'

const GROUP_STYLE: Record<CatalogGroup, { icon: React.ElementType; label: string; tint: string; color: string }> = {
  device:     { icon: Smartphone, label: 'موبايل',    tint: 'bg-emerald-50 dark:bg-emerald-900/20', color: 'text-emerald-500' },
  accessory:  { icon: Package,    label: 'إكسسوار',   tint: 'bg-indigo-50 dark:bg-indigo-900/20',   color: 'text-blue-600 dark:text-blue-400' },
  spare_part: { icon: Wrench,     label: 'قطعة غيار', tint: 'bg-slate-100 dark:bg-gray-800',        color: 'text-slate-500' },
}

interface Props {
  entry:     CatalogEntry
  inCartQty: number
  onAdd:     () => void
  onOpen:    () => void
  compare:   { active: boolean; disabled: boolean; onToggle: () => void } | null   // null = الصنف مش موبايل
}

export function CatalogItemCard({ entry, inCartQty, onAdd, onOpen, compare }: Props) {
  const g          = GROUP_STYLE[entry.group]
  const Icon       = g.icon
  const soldOut    = entry.maxQty < 1
  const reachedMax = inCartQty >= entry.maxQty

  return (
    <div className={cn(
      'bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-[22px] p-[18px] flex flex-col gap-3.5',
      soldOut && 'opacity-65',
    )}>
      <div onClick={onOpen} className={cn('relative h-40 rounded-2xl flex items-center justify-center cursor-pointer', soldOut ? 'bg-slate-100 dark:bg-gray-800' : g.tint)}>
        {entry.image
          ? <img src={entry.image} alt={entry.title} loading="lazy" className="max-h-full max-w-full object-contain p-3" />
          : <Icon size={56} strokeWidth={1.3} className={soldOut ? 'text-slate-400' : g.color} />}
        <span className={cn(
          'absolute top-3 right-3 text-xs font-semibold px-3 py-1 rounded-full',
          soldOut
            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
        )}>
          {soldOut ? 'نفد' : 'متوفر'}
        </span>
        {compare && (
          <button
            onClick={e => { e.stopPropagation(); compare.onToggle() }}
            disabled={compare.disabled && !compare.active}
            className={cn(
              'absolute bottom-3 right-3 h-8 px-3 rounded-full text-xs font-semibold flex items-center gap-1.5 border transition-colors disabled:opacity-40 disabled:cursor-not-allowed',
              compare.active
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white/90 dark:bg-gray-900/90 text-gray-700 dark:text-gray-300 border-slate-200 dark:border-gray-700',
            )}>
            <GitCompareArrows size={13} /> {compare.active ? 'في المقارنة' : 'قارن'}
          </button>
        )}
      </div>

      <div onClick={onOpen} className="cursor-pointer">
        <p className="text-xs text-slate-500 dark:text-gray-400 mb-1">
          {entry.kind === 'device' ? g.label : entry.subtitle}
        </p>
        <p className="text-base font-semibold text-gray-900 dark:text-white leading-snug">{entry.title}</p>
      </div>

      {entry.details.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {entry.details.map(d => (
            <span key={d} className="px-2 py-0.5 rounded-md text-xs bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-gray-300">
              {d}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mt-auto pt-1">
        <div>
          <p className="text-[22px] font-bold text-gray-900 dark:text-white leading-none">
            {fmt(entry.price)} <span className="text-[13px] font-medium text-slate-500">ج</span>
          </p>
          {entry.kind === 'device' && entry.maxQty > 1 && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">متاح {entry.maxQty} قطع</p>
          )}
        </div>
        <button
          onClick={onAdd}
          disabled={soldOut || reachedMax}
          className={cn(
            'h-10 px-4 rounded-[10px] text-sm font-semibold flex items-center gap-1.5 transition-colors',
            'disabled:cursor-not-allowed',
            soldOut
              ? 'bg-slate-200 dark:bg-gray-800 text-slate-400'
              : inCartQty > 0
                ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 disabled:opacity-80'
                : 'bg-blue-600 hover:bg-blue-700 text-white',
          )}
        >
          {soldOut ? 'غير متاح' : inCartQty > 0 ? <><Check size={14} /> {inCartQty}</> : <><Plus size={14} /> أضف</>}
        </button>
      </div>
    </div>
  )
}
