// src/pages/catalog/ViewToggle.tsx
// زر تبديل طريقة عرض الكتالوج: شبكة / قائمة
import { LayoutGrid, List } from 'lucide-react'
import { cn } from '@/lib/cn'

export type CatalogView = 'grid' | 'list'

const OPTIONS: { id: CatalogView; label: string; icon: React.ElementType }[] = [
  { id: 'grid', label: 'شبكة', icon: LayoutGrid },
  { id: 'list', label: 'قائمة', icon: List },
]

export function ViewToggle({ value, onChange }: { value: CatalogView; onChange: (v: CatalogView) => void }) {
  return (
    <div className="h-10 p-1 rounded-full border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex items-center">
      {OPTIONS.map(o => (
        <button key={o.id} onClick={() => onChange(o.id)} aria-label={o.label} aria-pressed={value === o.id}
          className={cn(
            'h-8 px-3 rounded-full flex items-center gap-1.5 text-sm transition-colors',
            value === o.id
              ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold'
              : 'text-slate-500 dark:text-gray-400',
          )}>
          <o.icon size={15} /> {o.label}
        </button>
      ))}
    </div>
  )
}
