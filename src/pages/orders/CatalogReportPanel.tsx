// src/pages/orders/CatalogReportPanel.tsx
import { useState } from 'react'
import { Eye, Users, ShoppingBag, Percent } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useCatalogReport } from '@/hooks/useCatalogAdmin'

const RANGES = [
  { days: 7,  label: '7 أيام'  },
  { days: 30, label: '30 يوم'  },
  { days: 90, label: '90 يوم'  },
]

export function CatalogReportPanel() {
  const [days, setDays] = useState(30)
  const { data, isLoading, isError } = useCatalogReport(days)

  const stats = data ? [
    { icon: Users,       label: 'زوار الكتالوج', value: data.visitors },
    { icon: ShoppingBag, label: 'طلبات',         value: data.orders },
    { icon: Percent,     label: 'نسبة التحويل',  value: `${data.conversionPercent}%` },
  ] : []

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm font-bold text-gray-900 dark:text-white">تقرير الكتالوج</p>
        <div className="flex gap-1.5">
          {RANGES.map(r => (
            <button key={r.days} onClick={() => setDays(r.days)}
              className={cn(
                'h-7 px-3 rounded-full text-xs border transition-colors',
                days === r.days
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300',
              )}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading && <p className="text-sm text-gray-500">جاري التحميل...</p>}
      {isError && <p className="text-sm text-red-600">تعذّر تحميل التقرير</p>}

      {data && (
        <>
          <div className="grid grid-cols-3 gap-3">
            {stats.map(({ icon: Icon, label, value }) => (
              <div key={label} className="rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800 p-3">
                <Icon size={15} className="text-blue-600 dark:text-blue-400 mb-1.5" />
                <p className="text-lg font-bold text-gray-900 dark:text-white">{value}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
              </div>
            ))}
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1.5">
              <Eye size={13} /> الأكثر مشاهدة
            </p>
            {data.top_viewed.length === 0 ? (
              <p className="text-sm text-gray-400">لسه مفيش مشاهدات مسجّلة</p>
            ) : (
              <div className="space-y-1.5">
                {data.top_viewed.map((t, i) => (
                  <div key={t.name} className="flex items-center justify-between text-sm">
                    <span className="text-gray-900 dark:text-white truncate">{i + 1}. {t.name}</span>
                    <span className="text-gray-500 dark:text-gray-400 flex-shrink-0">{t.views} مشاهدة</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
