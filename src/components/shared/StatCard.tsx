// src/components/shared/StatCard.tsx
import { cn } from '@/lib/cn'

// ── Color presets (used by Purchases, POS) ────────────────────────────────────

export type StatCardColor =
  | 'blue' | 'green' | 'amber' | 'red'
  | 'purple' | 'teal' | 'gray' | 'indigo'

const COLOR_MAP: Record<StatCardColor, { bg: string; icon: string }> = {
  blue:   { bg: 'bg-blue-50   dark:bg-blue-900/20',   icon: 'text-blue-600   dark:text-blue-400'   },
  green:  { bg: 'bg-green-50  dark:bg-green-900/20',  icon: 'text-green-600  dark:text-green-400'  },
  amber:  { bg: 'bg-amber-50  dark:bg-amber-900/20',  icon: 'text-amber-600  dark:text-amber-400'  },
  red:    { bg: 'bg-red-50    dark:bg-red-900/20',    icon: 'text-red-600    dark:text-red-400'    },
  purple: { bg: 'bg-purple-50 dark:bg-purple-900/20', icon: 'text-purple-600 dark:text-purple-400' },
  teal:   { bg: 'bg-teal-50   dark:bg-teal-900/20',   icon: 'text-teal-600   dark:text-teal-400'   },
  gray:   { bg: 'bg-gray-100  dark:bg-gray-800',      icon: 'text-gray-600   dark:text-gray-400'   },
  indigo: { bg: 'bg-indigo-50 dark:bg-indigo-900/20', icon: 'text-indigo-600 dark:text-indigo-400' },
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface StatCardProps {
  label:    string
  value:    string | number
  sub?:     string
  icon:     React.ElementType
  onClick?: () => void

  // Option A: use a named color preset
  color?: StatCardColor

  // Option B: pass raw Tailwind classes directly
  bgClass?:    string
  colorClass?: string
}

// ── Component ─────────────────────────────────────────────────────────────────

export function StatCard({
  label, value, sub, icon: Icon, onClick,
  color, bgClass, colorClass,
}: StatCardProps) {
  const resolved = color
    ? COLOR_MAP[color]
    : { bg: bgClass ?? '', icon: colorClass ?? '' }

  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 flex items-center gap-4',
        onClick && 'cursor-pointer hover:shadow-md hover:border-gray-300 dark:hover:border-gray-700 transition-all',
      )}
    >
      <div className={cn(
        'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
        resolved.bg,
      )}>
        <Icon size={18} className={resolved.icon} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{label}</p>
        <p className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">{value}</p>
        {sub && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">{sub}</p>
        )}
      </div>
    </div>
  )
}
