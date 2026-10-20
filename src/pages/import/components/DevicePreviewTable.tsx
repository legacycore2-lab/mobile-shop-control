// src/pages/import/components/DevicePreviewTable.tsx
import { useState } from 'react'
import type { ParsedSheet } from '@/services/import.service'
import type { ImportDeviceRow } from '@/repositories/import.repository'
import { cn } from '@/lib/cn'
import { fmt } from '@/lib/fmt'
import { CONDITION_LABELS, PREVIEW_LIMIT } from '../constants'
import { PreviewToolbar } from './PreviewToolbar'
import { RowStatusCell } from './RowStatusCell'

const TH = 'px-3 py-2 font-semibold text-gray-600 dark:text-gray-300'

function conditionClass(condition: string): string {
  if (condition === 'new')  return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
  if (condition === 'used') return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
  return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
}

export function DevicePreviewTable({ sheet }: { sheet: ParsedSheet<ImportDeviceRow> }) {
  const [showErrors, setShowErrors] = useState(true)
  const filtered = showErrors ? sheet.rows : sheet.rows.filter(r => r.valid)
  const visible  = filtered.slice(0, PREVIEW_LIMIT)

  return (
    <div>
      <PreviewToolbar
        shown={visible.length}
        total={filtered.length}
        showErrors={showErrors}
        onToggle={() => setShowErrors(v => !v)}
      />
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <th className={cn(TH, 'text-right w-10')}>الصف</th>
              <th className={cn(TH, 'text-right')}>IMEI 1</th>
              <th className={cn(TH, 'text-right')}>الماركة</th>
              <th className={cn(TH, 'text-right')}>الموديل</th>
              <th className={cn(TH, 'text-right')}>التخزين</th>
              <th className={cn(TH, 'text-right')}>الحالة</th>
              <th className={cn(TH, 'text-right')}>التكلفة</th>
              <th className={cn(TH, 'text-right')}>تاريخ الشراء</th>
              <th className={cn(TH, 'text-right')}>المراجعة</th>
            </tr>
          </thead>
          <tbody>
            {visible.map(r => (
              <tr key={r.rowNum} className={cn(
                'border-b border-gray-100 dark:border-gray-800 last:border-0',
                r.valid ? 'hover:bg-gray-50 dark:hover:bg-gray-800/50' : 'bg-red-50 dark:bg-red-900/10',
              )}>
                <td className="px-3 py-2 text-gray-400 dark:text-gray-600 font-mono">{r.rowNum}</td>
                <td className="px-3 py-2 font-mono text-gray-900 dark:text-white text-[11px]">
                  {r.data?.imei1 ?? <span className="text-red-500">—</span>}
                </td>
                <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{r.data?.brand_name ?? '—'}</td>
                <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{r.data?.model_name ?? '—'}</td>
                <td className="px-3 py-2 text-gray-500 dark:text-gray-400">{r.data?.storage ?? '—'}</td>
                <td className="px-3 py-2">
                  {r.data && (
                    <span className={cn('inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium', conditionClass(r.data.condition))}>
                      {CONDITION_LABELS[r.data.condition] ?? r.data.condition}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-right font-mono text-gray-700 dark:text-gray-300">
                  {r.data ? fmt(r.data.cost_price) : '—'}
                </td>
                <td className="px-3 py-2 font-mono text-gray-500 dark:text-gray-400 text-[11px]">
                  {r.data?.purchase_date ?? '—'}
                </td>
                <td className="px-3 py-2">
                  <RowStatusCell valid={r.valid} errors={r.errors} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
