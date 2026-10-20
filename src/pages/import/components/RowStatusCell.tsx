// src/pages/import/components/RowStatusCell.tsx
import { CheckCircle, XCircle } from 'lucide-react'

export function RowStatusCell({ valid, errors }: { valid: boolean; errors: string[] }) {
  if (valid) {
    return (
      <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
        <CheckCircle size={12} /> صحيح
      </span>
    )
  }
  return (
    <div>
      <span className="flex items-center gap-1 text-red-600 dark:text-red-400 mb-1">
        <XCircle size={12} /> خطأ
      </span>
      {errors.map((e, i) => (
        <p key={i} className="text-red-500 dark:text-red-400 text-[10px] leading-tight">{e}</p>
      ))}
    </div>
  )
}
