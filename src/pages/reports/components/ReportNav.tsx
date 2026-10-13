// src/pages/reports/components/ReportNav.tsx
import { cn } from '@/lib/cn'
import { REPORT_GROUPS, groupOfTab } from '../reportGroups'
import type { Tab } from '../types'

interface Props { tab: Tab; onChange: (tab: Tab) => void }

export function ReportNav({ tab, onChange }: Props) {
  const active = groupOfTab(tab)

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-1.5">
        {REPORT_GROUPS.map(g => {
          const Icon = g.icon
          const on   = g.id === active.id
          return (
            <button key={g.id} onClick={() => onChange(g.tabs[0].value)}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 rounded-lg py-2 px-2 transition-colors',
                on ? 'bg-[#0F2552] text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800',
              )}>
              <span className="flex items-center gap-1.5 text-sm font-bold"><Icon size={15} /> {g.label}</span>
              <span className={cn('text-[11px]', on ? 'text-white/70' : 'text-gray-400')}>{g.tabs.length} تقارير</span>
            </button>
          )
        })}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {active.tabs.map(({ value, label, icon: Icon }) => (
          <button key={value} onClick={() => onChange(value)}
            className={cn(
              'flex items-center gap-1.5 h-8 px-3.5 text-xs rounded-full border whitespace-nowrap transition-colors',
              tab === value
                ? 'bg-[#DBE5FA] border-[#0F2552] text-[#0F2552] font-bold dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-400'
                : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300',
            )}>
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>
    </div>
  )
}
