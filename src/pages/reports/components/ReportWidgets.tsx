// src/pages/reports/components/ReportWidgets.tsx
import { cn } from '@/lib/cn'
import React from 'react'

function fmtK(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}م`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}ك`
  return String(n)
}

export function KpiCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string | number; sub?: string
  icon: React.ElementType
  color: 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'teal'
}) {
  const C: Record<string, string> = {
    blue:   'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    green:  'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
    amber:  'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',
    red:    'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
    purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
    teal:   'bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400',
  }
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{label}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
          {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{sub}</p>}
        </div>
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', C[color])}>
          <Icon size={18} />
        </div>
      </div>
    </div>
  )
}

// ── Bar Chart (pure CSS) ──────────────────────────────────────────────────────

export function BarChart({ data, valueKey, labelKey, color = 'blue', height = 140 }: {
  data: ({ [key: string]: unknown })[]
  valueKey: string; labelKey: string
  color?: string; height?: number
}) {
  const max = Math.max(...data.map(d => Number(d[valueKey] ?? 0)), 1)
  return (
    <div style={{ height }} className="flex items-end gap-1 overflow-x-auto px-1">
      {data.map((d, i) => {
        const val = Number(d[valueKey] ?? 0)
        const pct = (val / max) * 100
        return (
          <div key={i} className="flex flex-col items-center gap-0.5 flex-1 min-w-[28px]">
            <div className="text-[9px] text-gray-500 dark:text-gray-400 truncate w-full text-center">
              {fmtK(val)}
            </div>
            <div
              className={`w-full rounded-t-sm transition-all ${
                color === 'green' ? 'bg-green-500' :
                color === 'red'   ? 'bg-red-500'   :
                color === 'amber' ? 'bg-amber-500' : 'bg-blue-500'
              }`}
              style={{ height: `${Math.max(pct, 2)}%` }}
            />
            <div className="text-[9px] text-gray-400 dark:text-gray-600 truncate w-full text-center">
              {String(d[labelKey] ?? '').slice(0, 8)}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Types ─────────────────────────────────────────────────────────────────────
