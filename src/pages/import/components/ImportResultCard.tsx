// src/pages/import/components/ImportResultCard.tsx
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import type { ImportResult } from '@/repositories/import.repository'
import { cn } from '@/lib/cn'

interface Props {
  title:  string
  unit:   string
  result: ImportResult
}

export function ImportResultCard({ title, unit, result }: Props) {
  const clean = result.failed === 0
  return (
    <div className="space-y-3">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 flex flex-col items-center gap-4 text-center">
        <div className={cn(
          'w-16 h-16 rounded-2xl flex items-center justify-center',
          clean ? 'bg-green-50 dark:bg-green-900/20' : 'bg-amber-50 dark:bg-amber-900/20',
        )}>
          {clean
            ? <CheckCircle size={32} className="text-green-600 dark:text-green-400" />
            : <AlertTriangle size={32} className="text-amber-600 dark:text-amber-400" />}
        </div>

        <div>
          <h2 className="text-base font-bold text-gray-900 dark:text-white">{title}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {result.success > 0 && `تم استيراد ${result.success} ${unit} بنجاح`}
            {result.failed > 0 && `${result.success > 0 ? ' · ' : ''}فشل ${result.failed}`}
          </p>
        </div>

        <div className="flex gap-4">
          <div className="text-center px-6 py-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
            <p className="text-2xl font-bold text-green-700 dark:text-green-400">{result.success}</p>
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">نجح</p>
          </div>
          {result.failed > 0 && (
            <div className="text-center px-6 py-3 bg-red-50 dark:bg-red-900/20 rounded-xl">
              <p className="text-2xl font-bold text-red-700 dark:text-red-400">{result.failed}</p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">فشل</p>
            </div>
          )}
        </div>
      </div>

      {result.errors.length > 0 && (
        <div className="bg-white dark:bg-gray-900 border border-red-200 dark:border-red-900 rounded-xl p-4">
          <h3 className="text-sm font-bold text-red-700 dark:text-red-400 mb-3 flex items-center gap-2">
            <XCircle size={15} /> أخطاء الاستيراد
          </h3>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {result.errors.map((e, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-red-600 dark:text-red-400">
                <span className="font-mono text-gray-400 w-12 flex-shrink-0">
                  {e.row > 0 ? `صف ${e.row}` : 'عام'}
                </span>
                <span>{e.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
