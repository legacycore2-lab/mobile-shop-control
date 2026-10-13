// src/pages/reports/tabs/TopProfitTab.tsx
// الأكثر ربحاً — أجهزة / منتجات / الاتنين معاً
import { useMemo } from 'react'
import { Award, DollarSign, Layers, Package, Smartphone, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/cn'
import { fmt } from '@/lib/fmt'
import { KpiCard } from '../components/ReportWidgets'
import { useProfitability } from '@/hooks/useProfitability'
import { profitabilityService, type ProfitKind, type ProfitRow } from '@/services/profitability.service'

interface Props {
  from?:        string
  to?:          string
  kind:         ProfitKind
  onKindChange: (kind: ProfitKind) => void
}

const FILTERS: { value: ProfitKind; label: string; icon: React.ElementType }[] = [
  { value: 'device',  label: 'الأجهزة',      icon: Smartphone },
  { value: 'product', label: 'المنتجات',     icon: Package    },
  { value: 'all',     label: 'الاتنين معاً', icon: Layers     },
]

const COLS = 'md:grid-cols-[2rem_minmax(0,1fr)_4.5rem_7rem_7rem_7rem_5rem]'

function RankBadge({ rank }: { rank: number }) {
  return (
    <span className={cn(
      'w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0',
      rank === 1 ? 'bg-amber-500 text-white'
        : rank === 2 ? 'bg-gray-400 text-white'
        : rank === 3 ? 'bg-orange-600 text-white'
        : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400',
    )}>{rank}</span>
  )
}

function KindChip({ kind }: { kind: ProfitRow['kind'] }) {
  return (
    <span className={cn(
      'px-1.5 py-0.5 rounded-md text-[10px] font-semibold shrink-0',
      kind === 'device'
        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
        : 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
    )}>
      {kind === 'device' ? 'جهاز' : 'منتج'}
    </span>
  )
}

export function TopProfitTabContent({ from, to, kind, onKindChange }: Props) {
  const { data: allRows = [], isLoading, isError } = useProfitability(from, to)

  const rows   = useMemo(() => profitabilityService.select(allRows, kind), [allRows, kind])
  const totals = useMemo(() => profitabilityService.totals(rows), [rows])
  const maxProfit = rows.reduce((m, r) => Math.max(m, r.profit), 0)

  return (
    <div className="space-y-5">

      {/* الفلتر */}
      <div className="grid grid-cols-3 gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 sm:inline-grid sm:w-auto">
        {FILTERS.map(({ value, label, icon: Icon }) => (
          <button key={value} onClick={() => onKindChange(value)}
            className={cn(
              'h-9 px-3 sm:px-5 text-xs sm:text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 whitespace-nowrap',
              kind === value
                ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300',
            )}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="الوحدات المباعة" value={fmt(totals.units)}          icon={Package}    color="blue"   />
        <KpiCard label="الإيراد (بعد الخصم)" value={`${fmt(totals.revenue)} ج`} icon={DollarSign} color="teal"   />
        <KpiCard label="التكلفة"         value={`${fmt(totals.cost)} ج`}    icon={DollarSign} color="purple" />
        <KpiCard label="إجمالي الربح"    value={`${fmt(totals.profit)} ج`}
          sub={`نسبة الربح من التكلفة ${totals.margin_pct.toFixed(1)}%`}
          icon={Award} color={totals.profit >= 0 ? 'green' : 'red'} />
      </div>

      {/* الترتيب */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
          <TrendingUp size={15} className="text-green-600 dark:text-green-400" />
          <p className="text-sm font-bold text-gray-900 dark:text-white">الأكثر ربحاً</p>
          <span className="text-xs text-gray-400">({rows.length})</span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : isError ? (
          <p className="text-center text-sm text-red-500 py-10">تعذّر تحميل التقرير، حاول تاني</p>
        ) : rows.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-10">مفيش مبيعات مؤكدة في الفترة دي</p>
        ) : (
          <div>
            <div className={cn('hidden md:grid gap-3 px-4 py-2 text-xs font-semibold text-gray-400 border-b border-gray-100 dark:border-gray-800', COLS)}>
              <span>#</span><span>الصنف</span>
              <span className="text-center">الوحدات</span>
              <span className="text-center">الإيراد</span>
              <span className="text-center">التكلفة</span>
              <span className="text-center">الربح</span>
              <span className="text-center">النسبة</span>
            </div>

            {rows.map((r, i) => (
              <div key={r.key}
                className={cn(
                  'grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 border-b border-gray-50 dark:border-gray-800/60 last:border-0',
                  COLS,
                )}>
                <RankBadge rank={i + 1} />

                <div className="min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <p dir="auto" className="text-sm font-semibold text-gray-900 dark:text-white truncate">{r.name}</p>
                    <KindChip kind={r.kind} />
                  </div>
                  <p dir="auto" className="text-xs text-gray-400 truncate md:hidden">
                    {fmt(r.units)} وحدة · إيراد {fmt(r.revenue)} ج · تكلفة {fmt(r.cost)} ج
                  </p>
                  <p dir="auto" className="hidden md:block text-xs text-gray-400 truncate">{r.subtitle}</p>
                  <div className="mt-1.5 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div className={cn('h-full rounded-full', r.profit >= 0 ? 'bg-green-500' : 'bg-red-500')}
                      style={{ width: maxProfit > 0 ? `${(Math.max(r.profit, 0) / maxProfit) * 100}%` : '0%' }} />
                  </div>
                </div>

                <span className="hidden md:block text-sm text-center text-gray-700 dark:text-gray-300">{fmt(r.units)}</span>
                <span className="hidden md:block text-sm text-center text-gray-700 dark:text-gray-300">{fmt(r.revenue)}</span>
                <span className="hidden md:block text-sm text-center text-gray-700 dark:text-gray-300">{fmt(r.cost)}</span>

                <div className="text-left md:contents">
                  <p className={cn('text-sm font-bold md:text-center', r.profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>
                    {fmt(r.profit)} ج
                  </p>
                  <p className="text-[11px] text-gray-400 md:text-sm md:text-center md:text-gray-700 dark:md:text-gray-300">
                    {r.margin_pct.toFixed(1)}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400 leading-relaxed">
        الإيراد بعد الخصم ومتوزع على بنود الفاتورة بنسبة سعر كل بند. تكلفة الجهاز هي تكلفته الفعلية،
        وتكلفة المنتج هي أعلى سعر شراء حالي له. الفواتير المؤكدة بس هي اللي بتتحسب.
      </p>
    </div>
  )
}
