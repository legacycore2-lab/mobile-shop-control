// src/pages/import/components/PreviewToolbar.tsx
import { ChevronDown, ChevronUp } from 'lucide-react'

interface Props {
  shown:      number
  total:      number
  showErrors: boolean
  onToggle:   () => void
}

export function PreviewToolbar({ shown, total, showErrors, onToggle }: Props) {
  return (
    <div className="flex items-center justify-between mb-3">
      <span className="text-xs text-gray-500 dark:text-gray-400">
        {shown === total ? `${total} صف` : `عرض ${shown} من ${total} صف — الباقي هيتستورد برضه`}
      </span>
      <button onClick={onToggle}
        className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline">
        {showErrors
          ? <><ChevronUp size={12} /> إخفاء الأخطاء</>
          : <><ChevronDown size={12} /> إظهار الأخطاء</>}
      </button>
    </div>
  )
}
