// src/pages/catalog/CatalogItemCard.tsx
import { Smartphone, Package, Wrench, Plus, Check } from 'lucide-react'
import { cn } from '@/lib/cn'
import { fmt } from '@/lib/fmt'
import type { CatalogEntry, CatalogGroup } from '@/services/catalog.service'

const ICONS: Record<CatalogGroup, React.ElementType> = {
  device:     Smartphone,
  accessory:  Package,
  spare_part: Wrench,
}

interface Props {
  entry:     CatalogEntry
  inCartQty: number
  onAdd:     () => void
}

export function CatalogItemCard({ entry, inCartQty, onAdd }: Props) {
  const Icon      = ICONS[entry.group]
  const soldOut   = entry.maxQty < 1
  const reachedMax = inCartQty >= entry.maxQty

  return (
    <div className={cn(
      'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 flex flex-col gap-3',
      soldOut && 'opacity-60',
    )}>
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
          <Icon size={20} className="text-blue-600 dark:text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900 dark:text-white leading-snug">{entry.title}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{entry.subtitle}</p>
        </div>
        {soldOut && (
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 flex-shrink-0">
            نفد
          </span>
        )}
      </div>

      {entry.details.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {entry.details.map(d => (
            <span key={d} className="px-2 py-0.5 rounded-md text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
              {d}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mt-auto pt-1">
        <div>
          <p className="text-lg font-bold text-gray-900 dark:text-white">{fmt(entry.price)} <span className="text-xs font-medium text-gray-500">ج</span></p>
          {entry.kind === 'device' && entry.maxQty > 1 && (
            <p className="text-xs text-green-600 dark:text-green-400">متاح {entry.maxQty} قطع</p>
          )}
          {entry.kind === 'product' && !soldOut && (
            <p className="text-xs text-green-600 dark:text-green-400">متوفر</p>
          )}
        </div>
        <button
          onClick={onAdd}
          disabled={soldOut || reachedMax}
          className={cn(
            'h-9 px-3 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition-colors',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            inCartQty > 0
              ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800'
              : 'bg-blue-600 hover:bg-blue-700 text-white',
          )}
        >
          {inCartQty > 0 ? <><Check size={14} /> {inCartQty}</> : <><Plus size={14} /> أضف</>}
        </button>
      </div>
    </div>
  )
}
