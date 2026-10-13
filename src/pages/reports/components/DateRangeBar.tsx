// src/pages/reports/components/DateRangeBar.tsx
import { Calendar, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { toDateKey, todayKey, shiftDateKey } from '@/lib/dateKey'

interface Props {
  from:     string
  to:       string
  onChange: (from: string, to: string) => void
}

interface Preset { id: string; label: string; range: () => [string, string] }

const PRESETS: Preset[] = [
  { id: 'today', label: 'اليوم',           range: () => [todayKey(), todayKey()] },
  { id: '7d',    label: 'آخر 7 أيام',      range: () => [shiftDateKey(todayKey(), -6), todayKey()] },
  { id: 'month', label: 'الشهر الحالي',    range: () => {
    const n = new Date()
    return [toDateKey(new Date(n.getFullYear(), n.getMonth(), 1)), todayKey()]
  } },
  { id: 'prev',  label: 'الشهر اللي فات',  range: () => {
    const n = new Date()
    return [toDateKey(new Date(n.getFullYear(), n.getMonth() - 1, 1)), toDateKey(new Date(n.getFullYear(), n.getMonth(), 0))]
  } },
  { id: 'all',   label: 'كل البيانات',     range: () => ['', ''] },
]

export function DateRangeBar({ from, to, onChange }: Props) {
  const activeId = PRESETS.find(p => {
    const [f, t] = p.range()
    return f === from && t === to
  })?.id

  return (
    <div className="flex items-center gap-2 flex-wrap bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-3 py-2.5">
      <span className="text-xs font-bold text-gray-700 dark:text-gray-300">الفترة:</span>
      {PRESETS.map(p => (
        <button key={p.id} onClick={() => onChange(...p.range())}
          className={cn(
            'h-7 px-3 rounded-lg text-xs transition-colors',
            activeId === p.id
              ? 'bg-[#0F2552] text-white font-semibold'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700',
          )}>
          {p.label}
        </button>
      ))}
      <span className="flex-1" />
      <div className="flex items-center gap-1.5 border border-gray-200 dark:border-gray-700 rounded-lg px-2">
        <Calendar size={13} className="text-gray-400 flex-shrink-0" />
        <input type="date" value={from} onChange={e => onChange(e.target.value, to)}
          className="h-7 text-xs bg-transparent text-gray-900 dark:text-white focus:outline-none w-28" />
        <span className="text-gray-300 text-xs">—</span>
        <input type="date" value={to} onChange={e => onChange(from, e.target.value)}
          className="h-7 text-xs bg-transparent text-gray-900 dark:text-white focus:outline-none w-28" />
        {(from || to) && (
          <button onClick={() => onChange('', '')} aria-label="مسح الفترة" className="text-gray-400 hover:text-red-500">
            <X size={12} />
          </button>
        )}
      </div>
    </div>
  )
}
