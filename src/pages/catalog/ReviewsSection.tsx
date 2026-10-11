// src/pages/catalog/ReviewsSection.tsx
import { Star } from 'lucide-react'
import type { CatalogReview } from '@/types/database'

function Stars({ value }: { value: number }) {
  return (
    <div className="flex gap-0.5" dir="ltr" aria-label={`${value} من 5`}>
      {[1, 2, 3, 4, 5].map(n => (
        <Star key={n} size={14} className={n <= value ? 'fill-amber-400 text-amber-400' : 'text-slate-300'} />
      ))}
    </div>
  )
}

export function ReviewsSection({ reviews }: { reviews: CatalogReview[] }) {
  if (reviews.length === 0) return null
  const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-7 pt-14">
      <div className="flex items-end justify-between flex-wrap gap-2 mb-6">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">آراء عملائنا</h2>
        <p className="text-sm text-slate-500 dark:text-gray-400 flex items-center gap-1.5">
          <Star size={16} className="fill-amber-400 text-amber-400" />
          <span className="font-bold text-gray-900 dark:text-white">{avg.toFixed(1)}</span>
          من {reviews.length} تقييم
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {reviews.map((r, i) => (
          <div key={i} className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-[20px] p-5 space-y-2.5">
            <Stars value={r.rating} />
            {r.comment && <p className="text-sm leading-7 text-gray-700 dark:text-gray-300">{r.comment}</p>}
            <p className="text-xs font-semibold text-slate-500 dark:text-gray-400">{r.name}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
