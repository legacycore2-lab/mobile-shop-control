// src/pages/stock-count/AnswerRow.tsx
import { Check, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { getDraftError } from '@/services/stockCount.service'
import type { AnswerDraft, StockCountItem } from '@/types/stockCount'
import { FIELD_CLASS, ITEM_TYPE_LABEL, ITEM_UNIT } from './constants'

interface Props {
  item:     StockCountItem
  draft:    AnswerDraft
  onChange: (draft: AnswerDraft) => void
}

// صنف واحد في الشاشة الخارجية: علامة صح أو غلط (مع كتابة العدد الصحيح)
export function AnswerRow({ item, draft, onChange }: Props) {
  const error = draft.isCorrect === false && draft.countedQty !== '' ? getDraftError(item, draft) : null

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 space-y-3">
      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400">{ITEM_TYPE_LABEL[item.item_type]}</p>
        <p className="text-base font-semibold text-gray-900 dark:text-white mt-0.5">{item.item_name}</p>
        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
          العدد في النظام:{' '}
          <span className="font-bold text-gray-900 dark:text-white">{item.system_qty}</span> {ITEM_UNIT[item.item_type]}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button type="button" aria-pressed={draft.isCorrect === true}
          onClick={() => onChange({ isCorrect: true, countedQty: '' })}
          className={cn(
            'h-12 rounded-lg border text-sm font-semibold flex items-center justify-center gap-2 transition-colors',
            draft.isCorrect === true
              ? 'bg-green-600 border-green-600 text-white'
              : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200',
          )}>
          <Check size={18} /> صح
        </button>
        <button type="button" aria-pressed={draft.isCorrect === false}
          onClick={() => onChange({ isCorrect: false, countedQty: draft.countedQty })}
          className={cn(
            'h-12 rounded-lg border text-sm font-semibold flex items-center justify-center gap-2 transition-colors',
            draft.isCorrect === false
              ? 'bg-red-600 border-red-600 text-white'
              : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200',
          )}>
          <X size={18} /> غلط
        </button>
      </div>

      {draft.isCorrect === false && (
        <label className="block">
          <span className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">العدد الصحيح</span>
          <input type="text" inputMode="numeric" autoComplete="off" value={draft.countedQty}
            onChange={e => onChange({ isCorrect: false, countedQty: e.target.value })}
            placeholder="اكتب العدد الفعلي"
            className={cn(FIELD_CLASS, 'h-11 text-base', error && 'border-red-500 focus:ring-red-500')} />
          {error && <span className="block text-xs text-red-600 dark:text-red-400 mt-1">{error}</span>}
        </label>
      )}
    </div>
  )
}
