// src/pages/stock-reconcile/CountStepper.tsx
import { Minus, Plus } from 'lucide-react'

interface Props {
  value:    number | null
  label:    string
  onChange: (next: number | null) => void
}

// عدّاد: + و − وخانة كتابة. الخانة الفاضية = لسه معدّش
export function CountStepper({ value, label, onChange }: Props) {
  const btn = 'h-10 w-10 flex items-center justify-center rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 active:bg-gray-100 dark:active:bg-gray-700'

  return (
    <div className="flex items-center gap-1.5">
      <button type="button" className={btn} aria-label={`نقص ${label}`}
        onClick={() => onChange(Math.max(0, (value ?? 0) - 1))}>
        <Minus size={16} />
      </button>
      <input
        type="text" inputMode="numeric" autoComplete="off" aria-label={`العدد الفعلي ${label}`}
        value={value ?? ''} placeholder="—"
        onChange={e => {
          const digits = e.target.value.replace(/\D/g, '')
          onChange(digits === '' ? null : Number(digits))
        }}
        className="h-10 w-14 text-center text-base font-bold rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button type="button" className={btn} aria-label={`زود ${label}`}
        onClick={() => onChange((value ?? 0) + 1)}>
        <Plus size={16} />
      </button>
    </div>
  )
}
