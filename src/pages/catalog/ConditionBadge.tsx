// src/pages/catalog/ConditionBadge.tsx
// شارة حالة الجهاز (جديد / مستعمل / مجدد)
import { cn } from '@/lib/cn'
import { CONDITION_MAP } from '@/constants/statusMaps'

const STYLE: Record<string, string> = {
  new:         'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  used:        'bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-300',
  refurbished: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300',
}

export function ConditionBadge({ condition }: { condition: string }) {
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-bold', STYLE[condition] ?? STYLE['used'])}>
      {CONDITION_MAP[condition] ?? condition}
    </span>
  )
}
