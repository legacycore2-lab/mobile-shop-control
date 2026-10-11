// src/pages/orders/ReviewsPanel.tsx
// مراجعة تقييمات العملاء قبل ظهورها في الكتالوج
import { Star, Check, X } from 'lucide-react'
import { fmtOrderDate } from './constants'
import { useCatalogReviews, useSetReviewStatus } from '@/hooks/useCatalogAdmin'
import type { ReviewStatus } from '@/types/database'

const STATUS_LABEL: Record<ReviewStatus, string> = {
  pending: 'بانتظار المراجعة', approved: 'ظاهر', rejected: 'مرفوض',
}

export function ReviewsPanel({ canEdit }: { canEdit: boolean }) {
  const { data: reviews = [] } = useCatalogReviews()
  const setStatus = useSetReviewStatus()

  if (reviews.length === 0) return null
  const pending = reviews.filter(r => r.status === 'pending').length

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 space-y-3">
      <p className="text-sm font-bold text-gray-900 dark:text-white">
        تقييمات العملاء {pending > 0 && <span className="text-amber-600">({pending} بانتظار المراجعة)</span>}
      </p>
      <div className="space-y-2 max-h-72 overflow-y-auto">
        {reviews.map(r => (
          <div key={r.id} className="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 p-3 flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-900 dark:text-white">{r.customer_name}</span>
                <span className="flex items-center gap-0.5 text-xs text-amber-600"><Star size={12} className="fill-amber-400 text-amber-400" />{r.rating}</span>
                <span className="text-xs text-gray-400">{fmtOrderDate(r.created_at)}</span>
              </div>
              {r.comment && <p className="text-sm text-gray-700 dark:text-gray-300">{r.comment}</p>}
              <p className="text-xs text-gray-500">{STATUS_LABEL[r.status]}</p>
            </div>
            {canEdit && (
              <div className="flex gap-1.5 flex-shrink-0">
                {r.status !== 'approved' && (
                  <button onClick={() => setStatus.mutate({ id: r.id, status: 'approved' })} aria-label="قبول"
                    className="w-8 h-8 rounded-lg bg-green-600 hover:bg-green-700 text-white flex items-center justify-center"><Check size={14} /></button>
                )}
                {r.status !== 'rejected' && (
                  <button onClick={() => setStatus.mutate({ id: r.id, status: 'rejected' })} aria-label="رفض"
                    className="w-8 h-8 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 flex items-center justify-center"><X size={14} /></button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
