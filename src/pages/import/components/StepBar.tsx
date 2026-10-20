// src/pages/import/components/StepBar.tsx
import { cn } from '@/lib/cn'

export type ImportStep = 'upload' | 'preview' | 'importing' | 'done'

const STEPS: { key: ImportStep; label: string }[] = [
  { key: 'upload',    label: 'رفع الملف' },
  { key: 'preview',   label: 'مراجعة البيانات' },
  { key: 'importing', label: 'استيراد' },
  { key: 'done',      label: 'اكتمل' },
]

export function StepBar({ step }: { step: ImportStep }) {
  const idx = STEPS.findIndex(s => s.key === step)
  return (
    <div className="flex items-center gap-0 overflow-x-auto pb-1">
      {STEPS.map((s, i) => (
        <div key={s.key} className="flex items-center flex-shrink-0">
          <div className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all',
            i <= idx
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500',
          )}>
            <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px]">
              {i < idx ? '✓' : i + 1}
            </span>
            {s.label}
          </div>
          {i < STEPS.length - 1 && (
            <div className={cn('w-6 h-0.5 mx-0.5', i < idx ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700')} />
          )}
        </div>
      ))}
    </div>
  )
}
