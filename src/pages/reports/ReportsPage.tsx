import { useState, useMemo } from 'react'
import {
  TrendingUp, Package, Truck, Users,
  DollarSign, BarChart2, AlertTriangle,
  RefreshCw, ChevronUp, ChevronDown, Minus,
} from 'lucide-react'
import {
  useReportSummary,
  useDeviceSalesReport,
  useStockValueReport,
  useSupplierPurchasesReport,
  useDailyActivityReport,
  useLowStockReport,
  useTopCustomersReport,
} from '@/hooks/useReports'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/cn'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) { return n.toLocaleString('ar-EG') }
function fmtK(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}م`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}ك`
  return String(n)
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  in_stock:       { label: 'في المخزون',  color: 'bg-blue-500'   },
  sold:           { label: 'مباع',        color: 'bg-green-500'  },
  sent_to_repair: { label: 'في الصيانة', color: 'bg-amber-500'  },
  defective:      { label: 'تالف',        color: 'bg-red-500'    },
  returned:       { label: 'مُعاد',       color: 'bg-purple-500' },
}

const MONTH_NAMES = ['يناير','فبراير','مارس','إبريل','مايو','يونيو',
  'يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string; sub?: string
  icon: React.ElementType
  color: 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'teal'
}) {
  const C: Record<string, string> = {
    blue:   'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    green:  'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
    amber:  'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',
    red:    'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
    purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
    teal:   'bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400',
  }
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{label}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
          {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{sub}</p>}
        </div>
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', C[color])}>
          <Icon size={18} />
        </div>
      </div>
    </div>
  )
}

// ── Bar Chart (pure CSS) ──────────────────────────────────────────────────────

function BarChart({ data, valueKey, labelKey, color = 'blue', height = 140 }: {
  data: Record<string, unknown>[]
  valueKey: string; labelKey: string
  color?: string; height?: number
}) {
  if (!data.length) return (
    <div className="flex items-center justify-center py-8 text-gray-400 dark:text-gray-600 text-sm">
      لا توجد بيانات
    </div>
  )
  const max = Math.max(...data.map(d => Number(d[valueKey] ?? 0)), 1)
  return (
    <div className="overflow-x-auto">
      <div className="flex items-end gap-1.5 min-w-0" style={{ height }}>
        {data.slice(0, 12).map((d, i) => {
          const val = Number(d[valueKey] ?? 0)
          const pct = (val / max) * 100
          return (
            <div key={i} className="flex flex-col items-center flex-1 min-w-[32px] h-full justify-end group">
              <div className="relative w-full flex justify-center">
                <div
                  className={cn(
                    'w-full rounded-t-md transition-all duration-500',
                    color === 'blue'   && 'bg-blue-500 dark:bg-blue-600',
                    color === 'green'  && 'bg-green-500 dark:bg-green-600',
                    color === 'amber'  && 'bg-amber-500 dark:bg-amber-600',
                    color === 'purple' && 'bg-purple-500 dark:bg-purple-600',
                  )}
                  style={{ height: `${Math.max(pct, 2)}%` }}
                />
                <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] text-gray-500 dark:text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-white dark:bg-gray-900 px-1 rounded shadow-sm border border-gray-200 dark:border-gray-700 z-10">
                  {fmtK(val)}
                </span>
              </div>
            </div>
          )
        })}
      </div>
      <div className="flex gap-1.5 mt-1">
        {data.slice(0, 12).map((d, i) => (
          <div key={i} className="flex-1 min-w-[32px] text-center">
            <span className="text-[9px] text-gray-400 dark:text-gray-600 leading-none block truncate">
              {String(d[labelKey] ?? '').slice(0, 6)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Donut Chart (SVG) ─────────────────────────────────────────────────────────

function DonutChart({ segments }: {
  segments: { label: string; value: number; color: string }[]
}) {
  const total = segments.reduce((s, x) => s + x.value, 0)
  if (!total) return (
    <div className="flex items-center justify-center py-8 text-gray-400 dark:text-gray-600 text-sm">
      لا توجد بيانات
    </div>
  )

  const SIZE = 120; const R = 48; const CX = SIZE / 2; const CY = SIZE / 2
  let cumAngle = -Math.PI / 2

  const arcs = segments.map(seg => {
    const angle = (seg.value / total) * 2 * Math.PI
    const startAngle = cumAngle
    cumAngle += angle
    const endAngle = cumAngle
    const x1 = CX + R * Math.cos(startAngle)
    const y1 = CY + R * Math.sin(startAngle)
    const x2 = CX + R * Math.cos(endAngle)
    const y2 = CY + R * Math.sin(endAngle)
    const largeArc = angle > Math.PI ? 1 : 0
    return { ...seg, d: `M ${CX} ${CY} L ${x1} ${y1} A ${R} ${R} 0 ${largeArc} 1 ${x2} ${y2} Z` }
  })

  const colorMap: Record<string, string> = {
    'bg-blue-500':   '#3b82f6',
    'bg-green-500':  '#22c55e',
    'bg-amber-500':  '#f59e0b',
    'bg-red-500':    '#ef4444',
    'bg-purple-500': '#a855f7',
  }

  return (
    <div className="flex items-center gap-4 flex-wrap">
      <svg width={SIZE} height={SIZE} className="flex-shrink-0">
        {arcs.map((arc, i) => (
          <path key={i} d={arc.d} fill={colorMap[arc.color] ?? '#94a3b8'} opacity={0.9} />
        ))}
        <circle cx={CX} cy={CY} r={28} fill="white" className="dark:fill-gray-900" />
        <text x={CX} y={CY + 4} textAnchor="middle" fontSize={11} fontWeight="bold" fill="#374151" className="dark:fill-gray-200">
          {total}
        </text>
      </svg>
      <div className="flex flex-col gap-1.5 flex-1">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', seg.color)} />
              <span className="text-xs text-gray-600 dark:text-gray-400">{seg.label}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-900 dark:text-white">{seg.value}</span>
              <span className="text-xs text-gray-400 dark:text-gray-600">
                {((seg.value / total) * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Activity Chart (30 days) ──────────────────────────────────────────────────

function ActivityChart({ data }: { data: { date: string; devices_added: number; devices_sold: number }[] }) {
  if (!data.length) return null
  const maxVal = Math.max(...data.flatMap(d => [d.devices_added, d.devices_sold]), 1)

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[600px]">
        <div className="flex items-end gap-0.5" style={{ height: 80 }}>
          {data.map((d, i) => (
            <div key={i} className="flex flex-col items-center gap-0.5 flex-1 h-full justify-end group relative">
              <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 text-[10px] text-gray-700 dark:text-gray-300 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-sm pointer-events-none">
                <p className="font-semibold">{d.date}</p>
                <p className="text-blue-600 dark:text-blue-400">مضاف: {d.devices_added}</p>
                <p className="text-green-600 dark:text-green-400">مباع: {d.devices_sold}</p>
              </div>
              <div className="w-full flex gap-px items-end h-full">
                <div
                  className="flex-1 bg-blue-400 dark:bg-blue-500 rounded-t-sm transition-all"
                  style={{ height: `${Math.max((d.devices_added / maxVal) * 100, d.devices_added > 0 ? 4 : 0)}%` }}
                />
                <div
                  className="flex-1 bg-green-400 dark:bg-green-500 rounded-t-sm transition-all"
                  style={{ height: `${Math.max((d.devices_sold / maxVal) * 100, d.devices_sold > 0 ? 4 : 0)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
        {/* X axis: show every 5 days */}
        <div className="flex gap-0.5 mt-1">
          {data.map((d, i) => (
            <div key={i} className="flex-1 text-center">
              {i % 5 === 0 && (
                <span className="text-[9px] text-gray-400 dark:text-gray-600">
                  {d.date.slice(8)}
                </span>
              )}
            </div>
          ))}
        </div>
        {/* Legend */}
        <div className="flex items-center gap-4 mt-2">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-blue-400 dark:bg-blue-500" />
            <span className="text-xs text-gray-500 dark:text-gray-400">أجهزة مضافة</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-green-400 dark:bg-green-500" />
            <span className="text-xs text-gray-500 dark:text-gray-400">أجهزة مباعة</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton({ rows = 4, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-3">
          {Array.from({ length: cols }).map((_, j) => (
            <div key={j} className="flex-1 h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
          ))}
        </div>
      ))}
    </div>
  )
}

// ── Tabs ──────────────────────────────────────────────────────────────────────

type Tab = 'overview' | 'sales' | 'stock' | 'suppliers' | 'customers' | 'alerts'

const TABS: { value: Tab; label: string; icon: React.ElementType }[] = [
  { value: 'overview',   label: 'نظرة عامة',    icon: BarChart2     },
  { value: 'sales',      label: 'مبيعات الأجهزة', icon: TrendingUp   },
  { value: 'stock',      label: 'المخزون',        icon: Package      },
  { value: 'suppliers',  label: 'الموردون',       icon: Truck        },
  { value: 'customers',  label: 'العملاء',        icon: Users        },
  { value: 'alerts',     label: 'التنبيهات',      icon: AlertTriangle },
]

// ── Main Page ─────────────────────────────────────────────────────────────────

export function ReportsPage() {
  const [tab, setTab] = useState<Tab>('overview')

  const { data: summary,    isLoading: sumLoad  } = useReportSummary()
  const { data: sales = [],  isLoading: saleLoad } = useDeviceSalesReport()
  const { data: stock = [],  isLoading: stckLoad } = useStockValueReport()
  const { data: suppliers = [], isLoading: supLoad } = useSupplierPurchasesReport()
  const { data: activity = [], isLoading: actLoad } = useDailyActivityReport()
  const { data: lowStock = [], isLoading: lowLoad } = useLowStockReport()
  const { data: customers = [], isLoading: custLoad } = useTopCustomersReport()

  // Status donut data derived from summary
  const statusData = useMemo(() => {
    if (!summary) return []
    return [
      { label: 'في المخزون',  value: summary.stockDevices,      color: 'bg-blue-500'   },
      { label: 'مباع',        value: summary.totalSoldDevices,   color: 'bg-green-500'  },
    ].filter(s => s.value > 0)
  }, [summary])

  const profitColor = (summary?.totalProfit ?? 0) >= 0 ? 'green' : 'red' as const

  return (
    <div className="max-w-7xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">التقارير</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">تحليل المبيعات والمخزون والأداء</p>
        </div>
        {(sumLoad || saleLoad || stckLoad) && (
          <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
            <RefreshCw size={12} className="animate-spin" />
            جاري تحميل البيانات...
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-1 flex gap-1 overflow-x-auto">
        {TABS.map(({ value, label, icon: Icon }) => (
          <button key={value} onClick={() => setTab(value)}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex-shrink-0',
              tab === value
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800',
            )}>
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* ── Overview Tab ── */}
      {tab === 'overview' && (
        <div className="space-y-5">
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <KpiCard label="إجمالي الإيرادات" value={`${fmt(summary?.totalRevenue ?? 0)} ج`}
              sub={`${fmt(summary?.totalSoldDevices ?? 0)} جهاز مباع`}
              icon={DollarSign} color="green" />
            <KpiCard label="إجمالي الأرباح" value={`${fmt(summary?.totalProfit ?? 0)} ج`}
              sub={`هامش ${summary?.avgMargin ?? 0}%`}
              icon={TrendingUp} color={profitColor} />
            <KpiCard label="قيمة المخزون الحالي" value={`${fmt(summary?.stockCostValue ?? 0)} ج`}
              sub={`${fmt(summary?.stockDevices ?? 0)} جهاز · بيع: ${fmt(summary?.stockSellingValue ?? 0)} ج`}
              icon={Package} color="blue" />
            <KpiCard label="تكلفة الأجهزة المباعة" value={`${fmt(summary?.totalCostSold ?? 0)} ج`}
              icon={Truck} color="amber" />
            <KpiCard label="تنبيهات المخزون" value={summary?.lowStockCount ?? 0}
              sub={(summary?.lowStockCount ?? 0) > 0 ? 'منتجات تحتاج إعادة طلب' : 'المخزون طبيعي'}
              icon={AlertTriangle} color={(summary?.lowStockCount ?? 0) > 0 ? 'red' : 'teal'} />
            <KpiCard label="أفضل العملاء" value={customers.length}
              sub={customers[0] ? `الأعلى: ${customers[0].customer_name}` : 'لا توجد بيانات'}
              icon={Users} color="purple" />
          </div>

          {/* Activity + Status */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-bold text-gray-900 dark:text-white">النشاط اليومي</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">آخر 30 يوم</p>
                </div>
              </div>
              {actLoad ? <Skeleton rows={3} cols={8} /> : <ActivityChart data={activity} />}
            </div>

            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
              <h2 className="text-sm font-bold text-gray-900 dark:text-white mb-4">توزيع الأجهزة</h2>
              {sumLoad ? <Skeleton rows={3} cols={2} /> : <DonutChart segments={statusData} />}
            </div>
          </div>

          {/* Top sales + Top suppliers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
              <h2 className="text-sm font-bold text-gray-900 dark:text-white mb-4">أعلى الموديلات مبيعاً</h2>
              {saleLoad ? <Skeleton /> : (
                <BarChart data={sales} valueKey="total_units" labelKey="model_name" color="blue" height={120} />
              )}
            </div>
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
              <h2 className="text-sm font-bold text-gray-900 dark:text-white mb-4">أعلى الموردين بالمشتريات</h2>
              {supLoad ? <Skeleton /> : (
                <BarChart data={suppliers} valueKey="total_cost" labelKey="supplier_name" color="purple" height={120} />
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Sales Tab ── */}
      {tab === 'sales' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">مبيعات الأجهزة حسب الموديل</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">إجمالي الأجهزة المباعة فقط</p>
            </div>
            {saleLoad ? (
              <div className="p-5"><Skeleton /></div>
            ) : sales.length === 0 ? (
              <div className="py-16 text-center text-gray-400 dark:text-gray-600">
                <TrendingUp size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">لا توجد مبيعات بعد</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                      {['#', 'الماركة', 'الموديل', 'الوحدات', 'إجمالي التكلفة', 'إجمالي الإيراد', 'الربح', 'هامش %'].map((h, i) => (
                        <th key={h} className={cn('px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap text-right', i >= 3 && 'text-center')}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sales.map((row, i) => (
                      <tr key={i} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <td className="px-4 py-3 text-xs text-gray-400 font-mono">{String(i + 1).padStart(2, '0')}</td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{row.brand_name}</td>
                        <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">{row.model_name}</td>
                        <td className="px-4 py-3 text-center font-bold text-blue-600 dark:text-blue-400">{row.total_units}</td>
                        <td className="px-4 py-3 text-center text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">{fmt(row.total_cost)} ج</td>
                        <td className="px-4 py-3 text-center text-sm font-semibold text-green-600 dark:text-green-400 whitespace-nowrap">{fmt(row.total_revenue)} ج</td>
                        <td className="px-4 py-3 text-center">
                          <span className={cn('text-sm font-bold whitespace-nowrap', row.profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>
                            {row.profit >= 0 ? '+' : ''}{fmt(row.profit)} ج
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {row.margin_pct > 0
                              ? <ChevronUp size={12} className="text-green-500" />
                              : row.margin_pct < 0
                                ? <ChevronDown size={12} className="text-red-500" />
                                : <Minus size={12} className="text-gray-400" />
                            }
                            <span className={cn('text-sm font-semibold',
                              row.margin_pct > 0 ? 'text-green-600 dark:text-green-400' :
                              row.margin_pct < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-500')}>
                              {row.margin_pct}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 dark:bg-gray-800/50 border-t-2 border-gray-200 dark:border-gray-700">
                      <td colSpan={3} className="px-4 py-3 text-sm font-bold text-gray-900 dark:text-white">الإجمالي</td>
                      <td className="px-4 py-3 text-center text-sm font-bold text-blue-600 dark:text-blue-400">
                        {sales.reduce((s, r) => s + r.total_units, 0)}
                      </td>
                      <td className="px-4 py-3 text-center text-sm font-bold text-gray-900 dark:text-white whitespace-nowrap">
                        {fmt(sales.reduce((s, r) => s + r.total_cost, 0))} ج
                      </td>
                      <td className="px-4 py-3 text-center text-sm font-bold text-green-600 dark:text-green-400 whitespace-nowrap">
                        {fmt(sales.reduce((s, r) => s + r.total_revenue, 0))} ج
                      </td>
                      <td className="px-4 py-3 text-center text-sm font-bold text-green-600 dark:text-green-400 whitespace-nowrap">
                        +{fmt(sales.reduce((s, r) => s + r.profit, 0))} ج
                      </td>
                      <td className="px-4 py-3 text-center text-sm font-bold text-gray-700 dark:text-gray-300">
                        {summary?.avgMargin ?? 0}%
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Stock Tab ── */}
      {tab === 'stock' && (
        <div className="space-y-4">
          {/* Chart */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white mb-4">قيمة المخزون حسب الماركة (تكلفة)</h2>
            {stckLoad ? <Skeleton rows={3} cols={6} /> : (
              <BarChart data={stock} valueKey="total_cost" labelKey="brand_name" color="blue" height={130} />
            )}
          </div>
          {/* Table */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">تفاصيل المخزون الحالي (أجهزة in_stock)</h2>
            </div>
            {stckLoad ? (
              <div className="p-5"><Skeleton /></div>
            ) : stock.length === 0 ? (
              <div className="py-16 text-center text-gray-400 dark:text-gray-600">
                <Package size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">المخزون فارغ</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                      {['الماركة', 'عدد الأجهزة', 'إجمالي التكلفة', 'إجمالي سعر البيع', 'الربح المتوقع'].map((h, i) => (
                        <th key={h} className={cn('px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide text-right', i >= 1 && 'text-center')}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {stock.map((row, i) => {
                      const profit = row.total_selling - row.total_cost
                      return (
                        <tr key={i} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                          <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">{row.brand_name}</td>
                          <td className="px-4 py-3 text-center font-bold text-blue-600 dark:text-blue-400">{row.count}</td>
                          <td className="px-4 py-3 text-center text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">{fmt(row.total_cost)} ج</td>
                          <td className="px-4 py-3 text-center text-sm font-semibold text-green-600 dark:text-green-400 whitespace-nowrap">{fmt(row.total_selling)} ج</td>
                          <td className="px-4 py-3 text-center">
                            <span className={cn('text-sm font-bold whitespace-nowrap', profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>
                              {profit >= 0 ? '+' : ''}{fmt(profit)} ج
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 dark:bg-gray-800/50 border-t-2 border-gray-200 dark:border-gray-700">
                      <td className="px-4 py-3 text-sm font-bold text-gray-900 dark:text-white">الإجمالي</td>
                      <td className="px-4 py-3 text-center text-sm font-bold text-blue-600 dark:text-blue-400">
                        {stock.reduce((s, r) => s + r.count, 0)}
                      </td>
                      <td className="px-4 py-3 text-center text-sm font-bold text-gray-900 dark:text-white whitespace-nowrap">
                        {fmt(stock.reduce((s, r) => s + r.total_cost, 0))} ج
                      </td>
                      <td className="px-4 py-3 text-center text-sm font-bold text-green-600 dark:text-green-400 whitespace-nowrap">
                        {fmt(stock.reduce((s, r) => s + r.total_selling, 0))} ج
                      </td>
                      <td className="px-4 py-3 text-center text-sm font-bold text-green-600 dark:text-green-400 whitespace-nowrap">
                        +{fmt(stock.reduce((s, r) => s + r.total_selling - r.total_cost, 0))} ج
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Suppliers Tab ── */}
      {tab === 'suppliers' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white mb-4">إجمالي المشتريات حسب المورد</h2>
            {supLoad ? <Skeleton rows={3} cols={6} /> : (
              <BarChart data={suppliers} valueKey="total_cost" labelKey="supplier_name" color="purple" height={130} />
            )}
          </div>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">تفاصيل المشتريات من الموردين</h2>
            </div>
            {supLoad ? (
              <div className="p-5"><Skeleton /></div>
            ) : suppliers.length === 0 ? (
              <div className="py-16 text-center text-gray-400 dark:text-gray-600 text-sm">لا توجد بيانات</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                      {['#', 'المورد', 'عدد الأجهزة', 'إجمالي التكلفة', 'النسبة'].map((h, i) => (
                        <th key={h} className={cn('px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide text-right', i >= 2 && 'text-center')}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const total = suppliers.reduce((s, r) => s + r.total_cost, 0)
                      return suppliers.map((row, i) => (
                        <tr key={i} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                          <td className="px-4 py-3 text-xs text-gray-400 font-mono">{String(i + 1).padStart(2, '0')}</td>
                          <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">{row.supplier_name}</td>
                          <td className="px-4 py-3 text-center text-sm font-bold text-blue-600 dark:text-blue-400">{row.total_devices}</td>
                          <td className="px-4 py-3 text-center text-sm font-semibold text-gray-900 dark:text-white whitespace-nowrap">{fmt(row.total_cost)} ج</td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center gap-2 justify-center">
                              <div className="flex-1 max-w-20 bg-gray-100 dark:bg-gray-800 rounded-full h-1.5">
                                <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: `${total > 0 ? (row.total_cost / total) * 100 : 0}%` }} />
                              </div>
                              <span className="text-xs text-gray-500 dark:text-gray-400 w-8 text-left">
                                {total > 0 ? ((row.total_cost / total) * 100).toFixed(0) : 0}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))
                    })()}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Customers Tab ── */}
      {tab === 'customers' && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">أفضل العملاء</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">حسب إجمالي المشتريات من الأجهزة المباعة</p>
          </div>
          {custLoad ? (
            <div className="p-5"><Skeleton /></div>
          ) : customers.length === 0 ? (
            <div className="py-16 text-center text-gray-400 dark:text-gray-600">
              <Users size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">لا توجد مبيعات مرتبطة بعملاء بعد</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                    {['#', 'العميل', 'عدد الأجهزة', 'إجمالي الإنفاق', 'النسبة'].map((h, i) => (
                      <th key={h} className={cn('px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide text-right', i >= 2 && 'text-center')}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const total = customers.reduce((s, r) => s + r.total_spent, 0)
                    return customers.map((row, i) => (
                      <tr key={row.customer_id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <td className="px-4 py-3">
                          <span className={cn('inline-flex w-6 h-6 rounded-full items-center justify-center text-xs font-bold',
                            i === 0 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' :
                            i === 1 ? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400' :
                            i === 2 ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400' :
                            'bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-500')}>
                            {i + 1}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">{row.customer_name}</td>
                        <td className="px-4 py-3 text-center text-sm font-bold text-blue-600 dark:text-blue-400">{row.device_count}</td>
                        <td className="px-4 py-3 text-center text-sm font-bold text-green-600 dark:text-green-400 whitespace-nowrap">
                          {fmt(row.total_spent)} ج
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center gap-2 justify-center">
                            <div className="flex-1 max-w-20 bg-gray-100 dark:bg-gray-800 rounded-full h-1.5">
                              <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${total > 0 ? (row.total_spent / total) * 100 : 0}%` }} />
                            </div>
                            <span className="text-xs text-gray-500 dark:text-gray-400 w-8 text-left">
                              {total > 0 ? ((row.total_spent / total) * 100).toFixed(0) : 0}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))
                  })()}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Alerts Tab ── */}
      {tab === 'alerts' && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">تنبيهات المخزون</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">منتجات وصلت أو تجاوزت حد إعادة الطلب</p>
            </div>
            {lowStock.length > 0 && (
              <Badge variant="danger" dot>{lowStock.length} منتج</Badge>
            )}
          </div>
          {lowLoad ? (
            <div className="p-5"><Skeleton /></div>
          ) : lowStock.length === 0 ? (
            <div className="py-16 text-center text-gray-400 dark:text-gray-600">
              <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center mx-auto mb-3">
                <Package size={24} className="text-green-600 dark:text-green-400" />
              </div>
              <p className="text-sm font-medium text-green-600 dark:text-green-400">المخزون في حالة جيدة</p>
              <p className="text-xs text-gray-400 dark:text-gray-600 mt-1">لا توجد منتجات تحتاج إعادة طلب</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                    {['المنتج', 'التصنيف', 'المتبقي', 'حد الطلب', 'قيمة المخزون', 'هامش الربح', 'الحالة'].map((h, i) => (
                      <th key={h} className={cn('px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide text-right', i >= 2 && 'text-center')}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lowStock.map(row => {
                    const margin = row.cost_price > 0
                      ? (((row.selling_price - row.cost_price) / row.cost_price) * 100).toFixed(1)
                      : '—'
                    return (
                      <tr key={row.product_id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">{row.product_name}</td>
                        <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">{row.category_name}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={cn('text-sm font-bold', row.stock_qty === 0 ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400')}>
                            {row.stock_qty}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-gray-700 dark:text-gray-300">{row.reorder_level}</td>
                        <td className="px-4 py-3 text-center text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                          {fmt(row.stock_value)} ج
                        </td>
                        <td className="px-4 py-3 text-center text-sm font-semibold text-blue-600 dark:text-blue-400">
                          {margin}%
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant={row.stock_qty === 0 ? 'danger' : 'warning'} dot>
                            {row.stock_qty === 0 ? 'نفد المخزون' : 'منخفض'}
                          </Badge>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
