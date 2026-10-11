// src/pages/catalog/PriceFilter.tsx
import { X } from 'lucide-react'

interface Props {
  min:      string
  max:      string
  onChange: (min: string, max: string) => void
}

const INPUT = 'h-10 w-28 sm:w-32 rounded-full border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 text-sm text-center text-gray-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-500'

function digitsOnly(v: string): string {
  return v.replace(/\D/g, '')
}

export function PriceFilter({ min, max, onChange }: Props) {
  return (
    <div className="flex items-center gap-2.5 flex-wrap">
      <span className="text-sm text-slate-500 dark:text-gray-400 whitespace-nowrap">السعر (ج):</span>
      <input
        inputMode="numeric" dir="ltr" placeholder="من" value={min}
        onChange={e => onChange(digitsOnly(e.target.value), max)}
        className={INPUT}
      />
      <span className="text-slate-400 text-sm">إلى</span>
      <input
        inputMode="numeric" dir="ltr" placeholder="إلى" value={max}
        onChange={e => onChange(min, digitsOnly(e.target.value))}
        className={INPUT}
      />
      {(min || max) && (
        <button onClick={() => onChange('', '')}
          className="h-10 px-4 rounded-full text-sm text-slate-600 dark:text-gray-300 border border-slate-200 dark:border-gray-700 flex items-center gap-1.5">
          <X size={14} /> مسح
        </button>
      )}
    </div>
  )
}
