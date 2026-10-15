// src/pages/stock-count/StockCountPage.tsx
import { ClipboardCheck } from 'lucide-react'
import { useStockCountSessions } from '@/hooks/useStockCount'
import { friendlyDbError } from '@/lib/errors'
import { CreateStockCountCard } from './CreateStockCountCard'
import { SessionCard } from './SessionCard'

export function StockCountPage() {
  const { data: sessions = [], isLoading, isError, error } = useStockCountSessions()

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">الجرد العشوائي</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          ابعت رابط الجرد لمسئول، وتابع ردوده (صح / غلط مع العدد الصحيح)
        </p>
      </div>

      <CreateStockCountCard />

      {isLoading && (
        <div className="space-y-3">
          {[0, 1, 2].map(i => <div key={i} className="h-[72px] rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />)}
        </div>
      )}

      {isError && (
        <p className="text-sm text-red-600 dark:text-red-400">{friendlyDbError(error)}</p>
      )}

      {!isLoading && !isError && sessions.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 gap-2 text-gray-400 dark:text-gray-600">
          <ClipboardCheck size={36} className="opacity-40" />
          <p className="text-sm">لسه مفيش جرد — أنشئ أول جلسة من فوق</p>
        </div>
      )}

      <div className="space-y-3">
        {sessions.map((s, i) => <SessionCard key={s.id} session={s} defaultOpen={i === 0} />)}
      </div>
    </div>
  )
}
