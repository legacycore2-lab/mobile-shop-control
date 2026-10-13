// src/pages/catalog/ConditionFilter.tsx
import { cn } from '@/lib/cn'
import { CONDITION_MAP } from '@/constants/statusMaps'

interface Props {
  conditions: string[]
  value:      string | null
  onChange:   (condition: string | null) => void
}

export function ConditionFilter({ conditions, value, onChange }: Props) {
  const options: { id: string | null; label: string }[] = [
    { id: null, label: 'الكل' },
    ...conditions.map(c => ({ id: c, label: CONDITION_MAP[c] ?? c })),
  ]
  return (
    <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
      <span className="text-sm text-slate-500 dark:text-gray-400 whitespace-nowrap">الحالة:</span>
      {options.map(o => (
        <button key={o.id ?? 'all'} onClick={() => onChange(o.id)}
          className={cn(
            'h-10 px-5 rounded-full text-sm whitespace-nowrap border transition-colors',
            value === o.id
              ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white font-semibold'
              : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-slate-200 dark:border-gray-700',
          )}>
          {o.label}
        </button>
      ))}
    </div>
  )
}
