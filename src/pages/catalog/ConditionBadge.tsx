// src/pages/catalog/ConditionBadge.tsx
// شارة حالة الجهاز (جديد / مستعمل / مجدد) بتدرّج ذهبي للجديد
import { Sparkles, BadgeCheck, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/cn'
import { CONDITION_MAP } from '@/constants/statusMaps'

const STYLE: Record<string, { icon: React.ElementType; cls: string }> = {
  new:         { icon: Sparkles,   cls: 'bg-gradient-to-l from-amber-400 to-amber-600 text-slate-900 border-amber-500' },
  used:        { icon: BadgeCheck, cls: 'bg-slate-900 text-amber-300 border-slate-900 dark:bg-gray-800 dark:border-gray-700' },
  refurbished: { icon: RefreshCw,  cls: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-900/20 dark:text-sky-300 dark:border-sky-800' },
}

export function ConditionBadge({ condition }: { condition: string }) {
  const s    = STYLE[condition] ?? STYLE['used']
  const Icon = s.icon
  return (
    <span className={cn('inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-xs font-bold', s.cls)}>
      <Icon size={12} />
      {CONDITION_MAP[condition] ?? condition}
    </span>
  )
}
