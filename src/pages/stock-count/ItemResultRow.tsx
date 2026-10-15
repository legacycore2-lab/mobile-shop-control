// src/pages/stock-count/ItemResultRow.tsx
import { Check, X, Minus } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { itemDiff } from '@/services/stockCount.service'
import type { StockCountItem } from '@/types/stockCount'
import { ITEM_TYPE_LABEL, ITEM_UNIT } from './constants'

interface Props {
  item: StockCountItem
}

// نتيجة صنف واحد بعد رد المسئول (للقراءة فقط)
export function ItemResultRow({ item }: Props) {
  const diff = itemDiff(item)
  const unit = ITEM_UNIT[item.item_type]

  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.item_name}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          {ITEM_TYPE_LABEL[item.item_type]} · النظام: {item.system_qty} {unit}
        </p>
      </div>

      {item.is_correct === true && (
        <Badge variant="success"><Check size={12} /> مطابق</Badge>
      )}
      {item.is_correct === false && (
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <Badge variant="danger"><X size={12} /> الفعلي: {item.counted_qty}</Badge>
          <span className="text-xs font-semibold text-red-600 dark:text-red-400" dir="ltr">
            {diff > 0 ? `+${diff}` : diff}
          </span>
        </div>
      )}
      {item.is_correct === null && (
        <Badge variant="neutral"><Minus size={12} /> لم يُرد</Badge>
      )}
    </div>
  )
}
