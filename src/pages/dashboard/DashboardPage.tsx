import { useMemo, useState } from 'react'
import {
  Smartphone, TrendingUp, AlertTriangle, Package,
  ArrowLeft, CheckCircle, Wrench, DollarSign, ScanLine,
  Users, Truck, BarChart2, RefreshCw, ShoppingCart,
  ShoppingBag, CreditCard, Wallet, Activity, PieChart,
  ArrowUpRight, ArrowDownRight, Minus,
} from 'lucide-react'
import { useDevices, useDeviceStats } from '@/hooks/useDevices'
import { useProductStats, useLowStockProducts } from '@/hooks/useProducts'
import { useSupplierStats } from '@/hooks/useSuppliers'
import { useSupplierLedger, useCustomerLedger } from '@/hooks/usePayments'
import { AddPaymentModal } from '@/pages/payments/AddPaymentModal'
import { useCustomerStats } from '@/hooks/useCustomers'
import { useSaleStats } from '@/hooks/usePos'
import { usePurchaseStats } from '@/hooks/usePurchases'
import { Badge } from '@/components/ui/Badge'
import { useNavigate } from 'react-router-dom'
import { QuickScanModal } from './QuickScanModal'
import { cn } from '@/lib/cn'
import type { MobileDeviceView } from '@/types/database'
import { DEVICE_STATUS_MAP, fmt } from '@/constants/statusMaps'

// ── KPI Card ──────────────────────────────────────────────────────────────────

type ColorKey = 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'teal' | 'gray' | 'indigo' | 'rose' | 'cyan'

const COLOR_MAP: Record<ColorKey, { bg: string; icon: string; border: string; text: string }> = {
  blue:   { bg: 'bg-blue-50   dark:bg-blue-900/20',   icon: 'text-blue-600   dark:text-blue-400',   border: 'border-blue-200   dark:border-blue-800',   text: 'text-blue-700   dark:text-blue-300'   },
  green:  { bg: 'bg-green-50  dark:bg-green-900/20',  icon: 'text-green-600  dark:text-green-400',  border: 'border-green-200  dark:border-green-800',  text: 'text-green-700  dark:text-green-300'  },
  amber:  { bg: 'bg-amber-50  dark:bg-amber-900/20',  icon: 'text-amber-600  dark:text-amber-400',  border: 'border-amber-200  dark:border-amber-800',  text: 'text-amber-700  dark:text-amber-300'  },
  red:    { bg: 'bg-red-50    dark:bg-red-900/20',    icon: 'text-red-600    dark:text-red-400',    border: 'border-red-200    dark:border-red-800',    text: 'text-red-700    dark:text-red-300'    },
  purple: { bg: 'bg-purple-50 dark:bg-purple-900/20', icon: 'text-purple-600 dark:text-purple-400', border: 'border-purple-200 dark:border-purple-800', text: 'text-purple-700 dark:text-purple-300' },
  teal:   { bg: 'bg-teal-50   dark:bg-teal-900/20',   icon: 'text-teal-600   dark:text-teal-400',   border: 'border-teal-200   dark:border-teal-800',   text: 'text-teal-700   dark:text-teal-300'   },
  gray:   { bg: 'bg-gray-100  dark:bg-gray-800',      icon: 'text-gray-600   dark:text-gray-400',   border: 'border-gray-200   dark:border-gray-700',   text: 'text-gray-700   dark:text-gray-300'   },
  indigo: { bg: 'bg-indigo-50 dark:bg-indigo-900/20', icon: 'text-indigo-600 dark:text-indigo-400', border: 'border-indigo-200 dark:border-indigo-800', text: 'text-indigo-700 dark:text-indigo-300' },
  rose:   { bg: 'bg-rose-50   dark:bg-rose-900/20',   icon: 'text-rose-600   dark:text-rose-400',   border: 'border-rose-200   dark:border-rose-800',   text: 'text-rose-700   dark:text-rose-300'   },
  cyan:   { bg: 'bg-cyan-50   dark:bg-cyan-900/20',   icon: 'text-cyan-600   dark:text-cyan-400',   border: 'border-cyan-200   dark:border-cyan-800',   text: 'text-cyan-700   dark:text-cyan-300'   },
}

function KpiCard({
  label, value, sub, icon: Icon, color, onClick, trend,
}: {
  label: string
  value: string | number
  sub?: string
  icon: React.ElementType
  color: ColorKey
  onClick?: () => void
  trend?: { value: string; up?: boolean; neutral?: boolean }
}) {
  const c = COLOR_MAP[color]
  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 transition-all',
        onClick && 'cursor-pointer hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{label}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1 leading-tight">{value}</p>
          {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 truncate">{sub}</p>}
          {trend && (
            <div className={cn(
              'flex items-center gap-1 mt-1.5 text-xs font-semibold',
              trend.neutral ? 'text-gray-400' : trend.up ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400',
            )}>
              {trend.neutral ? <Minus size={10} /> : trend.up ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
              {trend.value}
            </div>
          )}
        </div>
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border', c.bg, c.border)}>
          <Icon size={18} className={c.icon} />
        </div>
      </div>
    </div>
  )
}

// ── Section Header ────────────────────────────────────────────────────────────

function SectionHeader({ title, sub, to, navigate }: {
  title: string; sub?: string; to: string
  navigate: ReturnType<typeof useNavigate>
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div>
        <h2 className="text-sm font-bold text-gray-900 dark:text-white">{title}</h2>
        {sub && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{sub}</p>}
      </div>
      <button
        onClick={() => navigate(to)}
        className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
      >
        عرض الكل <ArrowLeft size={12} />
      </button>
    </div>
  )
}

// ── Group Header ──────────────────────────────────────────────────────────────

function GroupHeader({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
      <Icon size={12} /> {label}
    </p>
  )
}

// ── Financial Summary Bar ─────────────────────────────────────────────────────

function FinBar({ label, value, color }: { label: string; value: number; color: ColorKey }) {
  const c = COLOR_MAP[color]
  return (
    <div className={cn('rounded-xl border p-4 flex flex-col gap-1', c.bg, c.border)}>
      <p className={cn('text-xs font-semibold', c.text)}>{label}</p>
      <p className="text-xl font-bold text-gray-900 dark:text-white">{fmt(value)} ج</p>
    </div>
  )
}

// ── Progress Bar ──────────────────────────────────────────────────────────────

function ProgressBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-600 dark:text-gray-400">{label}</span>
        <span className="font-semibold text-gray-900 dark:text-white">{pct.toFixed(0)}%</span>
      </div>
      <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

// ── Device Row ────────────────────────────────────────────────────────────────

function DeviceRow({ d }: { d: MobileDeviceView }) {
  const st = DEVICE_STATUS_MAP[d.status]
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
          {d.brand_name} {d.model_name}
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-600 font-mono mt-0.5 truncate">{d.imei1}</p>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0 mr-3">
        <span className="text-xs font-semibold text-gray-900 dark:text-white whitespace-nowrap">
          {fmt(d.cost_price)} ج
        </span>
        <Badge variant={st.variant} dot>{st.label}</Badge>
      </div>
    </div>
  )
}

// ── Due Row ───────────────────────────────────────────────────────────────────

function DueRow({ name, balance, onPay, color }: {
  name: string; balance: number
  onPay: () => void; color: 'red' | 'amber'
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{name}</p>
        <p className={cn('text-xs font-bold', color === 'red' ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400')}>
          {fmt(balance)} ج
        </p>
      </div>
      <button
        onClick={onPay}
        className="h-7 px-3 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-semibold flex items-center gap-1 transition-colors flex-shrink-0 whitespace-nowrap"
      >
        <DollarSign size={11} /> سداد
      </button>
    </div>
  )
}

// ── Donut Segment (pure CSS) ──────────────────────────────────────────────────

function MiniDonut({ paidPct, duePct }: { paidPct: number; duePct: number }) {
  const r = 40
  const circ = 2 * Math.PI * r
  const paid = (paidPct / 100) * circ
  const due  = (duePct  / 100) * circ
  const rest = circ - paid - due
  return (
    <svg width="100" height="100" viewBox="0 0 100 100" className="rotate-[-90deg]">
      <circle cx="50" cy="50" r={r} fill="none" stroke="currentColor" strokeWidth="14"
        className="text-gray-100 dark:text-gray-800" strokeDasharray={`${circ}`} />
      <circle cx="50" cy="50" r={r} fill="none" stroke="#22c55e" strokeWidth="14"
        strokeDasharray={`${paid} ${circ - paid}`} strokeDashoffset="0" />
      <circle cx="50" cy="50" r={r} fill="none" stroke="#f59e0b" strokeWidth="14"
        strokeDasharray={`${due} ${circ - due}`} strokeDashoffset={-paid} />
      <circle cx="50" cy="50" r={r} fill="none" stroke="#e5e7eb" strokeWidth="14"
        strokeDasharray={`${rest} ${circ - rest}`} strokeDashoffset={-(paid + due)} />
    </svg>
  )
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

export function DashboardPage() {
  const navigate = useNavigate()
  const [showScan, setShowScan]   = useState(false)
  const [payModal, setPayModal]   = useState<{
    invoiceId: string; invoiceNumber: string
    partyId: string; partyName: string
    partyType: 'supplier' | 'customer'
    paymentType: 'purchase' | 'sale'
    remaining: number
  } | null>(null)

  // ── Data ──
  const { data: devices        = [], isLoading: devLoading  } = useDevices()
  const { data: deviceStats,         isLoading: devStatLoad } = useDeviceStats()
  const { data: productStats,        isLoading: prodStatLoad } = useProductStats()
  const { data: supplierStats,       isLoading: supStatLoad  } = useSupplierStats()
  const { data: customerStats,       isLoading: custStatLoad } = useCustomerStats()
  const { data: saleStats,           isLoading: saleStatLoad } = useSaleStats()
  const { data: purchaseStats,       isLoading: purStatLoad  } = usePurchaseStats()
  const { data: lowStockItems  = [], isLoading: lowLoad }     = useLowStockProducts()
  const { data: supplierLedger = [] } = useSupplierLedger()
  const { data: customerLedger = [] } = useCustomerLedger()

  const totalLoading = devLoading || devStatLoad || prodStatLoad || supStatLoad || custStatLoad || saleStatLoad || purStatLoad

  // ── Computed ──
  const recentDevices = useMemo(() =>
    [...devices]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5),
    [devices],
  )

  const soldToday = useMemo(() => {
    const today = new Date().toDateString()
    return devices.filter(d => d.status === 'sold' && d.sold_at && new Date(d.sold_at).toDateString() === today)
  }, [devices])

  const stockValue      = deviceStats?.totalCostValue    ?? 0
  const stockSelling    = deviceStats?.totalSellingValue ?? 0
  const potentialProfit = stockSelling - stockValue

  const revenue    = saleStats?.totalRevenue ?? 0
  const revPaid    = saleStats?.totalPaid    ?? 0
  const revDue     = saleStats?.totalDue     ?? 0
  const purchases  = purchaseStats?.totalSpent ?? 0
  const purPaid    = purchaseStats?.totalPaid  ?? 0
  const purDue     = purchaseStats?.totalDue   ?? 0

  const grossProfit = revenue - purchases
  const salePaidPct   = revenue  > 0 ? (revPaid  / revenue)  * 100 : 0
  const saleDuePct    = revenue  > 0 ? (revDue   / revenue)  * 100 : 0
  const purPaidPct    = purchases > 0 ? (purPaid  / purchases) * 100 : 0
  const purDuePct     = purchases > 0 ? (purDue   / purchases) * 100 : 0

  const topSupplierDebts = supplierLedger
    .filter(s => Number(s.balance) > 0)
    .sort((a, b) => Number(b.balance) - Number(a.balance))
    .slice(0, 5)
  const topCustomerDebts = customerLedger
    .filter(c => Number(c.balance) > 0)
    .sort((a, b) => Number(b.balance) - Number(a.balance))
    .slice(0, 5)

  // ── Render ──
  return (
    <div className="max-w-7xl mx-auto space-y-6">

      {/* ── Page Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">لوحة التحكم</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {totalLoading && (
            <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
              <RefreshCw size={12} className="animate-spin" /> جاري التحديث...
            </div>
          )}
          <button
            onClick={() => setShowScan(true)}
            className="h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold flex items-center gap-2 transition-colors shadow-lg shadow-blue-600/25"
          >
            <ScanLine size={16} /> مسح سريع
          </button>
        </div>
      </div>

      {/* ── Financial Overview Row ── */}
      <div>
        <GroupHeader icon={Activity} label="الملخص المالي الإجمالي" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard
            label="إجمالي الإيرادات"
            value={`${fmt(revenue)} ج`}
            sub={`${saleStats?.confirmed ?? 0} فاتورة مؤكدة`}
            icon={TrendingUp} color="green"
            onClick={() => navigate('/pos')}
          />
          <KpiCard
            label="إجمالي المشتريات"
            value={`${fmt(purchases)} ج`}
            sub={`${purchaseStats?.confirmed ?? 0} فاتورة مؤكدة`}
            icon={ShoppingBag} color="purple"
            onClick={() => navigate('/purchases')}
          />
          <KpiCard
            label="إجمالي المحصّل (مبيعات)"
            value={`${fmt(revPaid)} ج`}
            sub={`متبقي: ${fmt(revDue)} ج`}
            icon={Wallet} color="teal"
            trend={{ value: `${salePaidPct.toFixed(0)}% محصّل`, up: salePaidPct >= 75 }}
          />
          <KpiCard
            label="إجمالي المدفوع (مشتريات)"
            value={`${fmt(purPaid)} ج`}
            sub={`متبقي: ${fmt(purDue)} ج`}
            icon={CreditCard} color="indigo"
            trend={{ value: `${purPaidPct.toFixed(0)}% مدفوع`, up: purPaidPct >= 75 }}
          />
        </div>
      </div>

      {/* ── Profit + Collection Progress ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Profit Cards */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 space-y-3">
          <p className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <PieChart size={14} className="text-green-500" /> ربحية الأعمال
          </p>
          <div className="grid grid-cols-1 gap-2">
            <FinBar label="إجمالي الإيرادات" value={revenue}   color="green" />
            <FinBar label="إجمالي التكاليف"  value={purchases} color="purple" />
            <div className={cn(
              'rounded-xl border p-4 flex flex-col gap-1',
              grossProfit >= 0
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                : 'bg-red-50   dark:bg-red-900/20   border-red-200   dark:border-red-800',
            )}>
              <p className={cn('text-xs font-semibold', grossProfit >= 0 ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300')}>
                {grossProfit >= 0 ? 'الربح الإجمالي' : 'الخسارة الإجمالية'}
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{fmt(Math.abs(grossProfit))} ج</p>
              {revenue > 0 && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  هامش الربح {((grossProfit / revenue) * 100).toFixed(1)}%
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Sales Collection Chart */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
          <p className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
            <ShoppingCart size={14} className="text-green-500" /> تحصيل المبيعات
          </p>
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0">
              <MiniDonut paidPct={salePaidPct} duePct={saleDuePct} />
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <div className="flex items-center gap-1.5 mb-0.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                  <span className="text-xs text-gray-500 dark:text-gray-400">محصّل</span>
                </div>
                <p className="text-sm font-bold text-gray-900 dark:text-white">{fmt(revPaid)} ج</p>
              </div>
              <div>
                <div className="flex items-center gap-1.5 mb-0.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span className="text-xs text-gray-500 dark:text-gray-400">متبقي</span>
                </div>
                <p className="text-sm font-bold text-amber-600 dark:text-amber-400">{fmt(revDue)} ج</p>
              </div>
              <div>
                <div className="flex items-center gap-1.5 mb-0.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-gray-300 dark:bg-gray-600" />
                  <span className="text-xs text-gray-500 dark:text-gray-400">مسودة</span>
                </div>
                <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                  {(saleStats?.draft ?? 0)} فاتورة
                </p>
              </div>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <ProgressBar label="نسبة التحصيل" value={revPaid} max={revenue} color="bg-green-500" />
          </div>
        </div>

        {/* Purchases Payment Chart */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
          <p className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
            <ShoppingBag size={14} className="text-purple-500" /> سداد المشتريات
          </p>
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0">
              <MiniDonut paidPct={purPaidPct} duePct={purDuePct} />
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <div className="flex items-center gap-1.5 mb-0.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                  <span className="text-xs text-gray-500 dark:text-gray-400">مدفوع</span>
                </div>
                <p className="text-sm font-bold text-gray-900 dark:text-white">{fmt(purPaid)} ج</p>
              </div>
              <div>
                <div className="flex items-center gap-1.5 mb-0.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span className="text-xs text-gray-500 dark:text-gray-400">متبقي</span>
                </div>
                <p className="text-sm font-bold text-amber-600 dark:text-amber-400">{fmt(purDue)} ج</p>
              </div>
              <div>
                <div className="flex items-center gap-1.5 mb-0.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-gray-300 dark:bg-gray-600" />
                  <span className="text-xs text-gray-500 dark:text-gray-400">ملغية</span>
                </div>
                <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                  {(purchaseStats?.cancelled ?? 0)} فاتورة
                </p>
              </div>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <ProgressBar label="نسبة السداد" value={purPaid} max={purchases} color="bg-purple-500" />
          </div>
        </div>
      </div>

      {/* ── Devices KPIs ── */}
      <div>
        <GroupHeader icon={Smartphone} label="الأجهزة" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard
            label="في المخزون"
            value={deviceStats?.inStock ?? 0}
            sub={`${fmt(stockValue)} ج — تكلفة`}
            icon={Smartphone} color="blue"
            onClick={() => navigate('/devices')}
          />
          <KpiCard
            label="مباع إجمالي"
            value={deviceStats?.sold ?? 0}
            icon={CheckCircle} color="green"
            onClick={() => navigate('/devices')}
          />
          <KpiCard
            label="مبيعات اليوم"
            value={soldToday.length}
            sub={soldToday.length > 0 ? `آخر بيع: ${soldToday[0]?.brand_name ?? ''}` : 'لا يوجد مبيعات اليوم'}
            icon={TrendingUp} color="purple"
          />
          <KpiCard
            label="في الصيانة / تالف"
            value={(deviceStats?.repair ?? 0) + (deviceStats?.defective ?? 0)}
            sub={`${deviceStats?.repair ?? 0} صيانة · ${deviceStats?.defective ?? 0} تالف`}
            icon={Wrench} color="amber"
            onClick={() => navigate('/devices')}
          />
        </div>
      </div>

      {/* ── Inventory Value ── */}
      <div>
        <GroupHeader icon={DollarSign} label="قيمة مخزون الأجهزة" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <KpiCard label="تكلفة المخزون"       value={`${fmt(stockValue)} ج`}      icon={DollarSign}  color="gray"  />
          <KpiCard label="سعر البيع المقترح"   value={`${fmt(stockSelling)} ج`}    icon={BarChart2}   color="teal"  />
          <KpiCard
            label="الربح المتوقع من المخزون"
            value={`${fmt(potentialProfit)} ج`}
            sub={stockValue > 0 ? `هامش ${((potentialProfit / stockValue) * 100).toFixed(1)}%` : undefined}
            icon={TrendingUp}
            color={potentialProfit >= 0 ? 'green' : 'red'}
          />
        </div>
      </div>

      {/* ── Products + Parties ── */}
      <div>
        <GroupHeader icon={Package} label="المنتجات والعلاقات" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard
            label="منتجات في المخزون"
            value={productStats?.active ?? 0}
            sub={productStats?.lowStock ? `${productStats.lowStock} منخفض المخزون` : undefined}
            icon={Package} color="blue"
            onClick={() => navigate('/products')}
          />
          <KpiCard
            label="تنبيهات مخزون"
            value={productStats?.lowStock ?? 0}
            sub={(productStats?.lowStock ?? 0) > 0 ? 'تحتاج إعادة طلب' : 'المخزون طبيعي'}
            icon={AlertTriangle}
            color={(productStats?.lowStock ?? 0) > 0 ? 'red' : 'green'}
            onClick={() => navigate('/products')}
          />
          <KpiCard
            label="الموردون النشطون"
            value={supplierStats?.active ?? 0}
            sub={`${supplierStats?.total ?? 0} إجمالي`}
            icon={Truck} color="purple"
            onClick={() => navigate('/suppliers')}
          />
          <KpiCard
            label="العملاء النشطون"
            value={customerStats?.active ?? 0}
            sub={`${customerStats?.total ?? 0} إجمالي`}
            icon={Users} color="teal"
            onClick={() => navigate('/customers')}
          />
        </div>
      </div>

      {/* ── Bottom Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Due Payments — side by side */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">المستحقات</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">موردون وعملاء بأرصدة مستحقة</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Suppliers */}
            <div>
              <p className="text-xs font-bold text-red-500 mb-2 flex items-center gap-1">
                <Truck size={11} /> للموردين ({topSupplierDebts.length})
              </p>
              {topSupplierDebts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 text-gray-400 dark:text-gray-600">
                  <CheckCircle size={24} className="mb-1 text-green-500 opacity-60" />
                  <p className="text-xs">لا توجد مستحقات</p>
                </div>
              ) : (
                topSupplierDebts.map(s => (
                  <DueRow
                    key={s.supplier_id}
                    name={s.supplier_name}
                    balance={Number(s.balance)}
                    color="red"
                    onPay={() => setPayModal({
                      invoiceId: '', invoiceNumber: '',
                      partyId: s.supplier_id, partyName: s.supplier_name,
                      partyType: 'supplier', paymentType: 'purchase',
                      remaining: Number(s.balance),
                    })}
                  />
                ))
              )}
            </div>

            {/* Customers */}
            <div>
              <p className="text-xs font-bold text-amber-500 mb-2 flex items-center gap-1">
                <Users size={11} /> من العملاء ({topCustomerDebts.length})
              </p>
              {topCustomerDebts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 text-gray-400 dark:text-gray-600">
                  <CheckCircle size={24} className="mb-1 text-green-500 opacity-60" />
                  <p className="text-xs">لا توجد مستحقات</p>
                </div>
              ) : (
                topCustomerDebts.map(c => (
                  <DueRow
                    key={c.customer_id}
                    name={c.customer_name}
                    balance={Number(c.balance)}
                    color="amber"
                    onPay={() => setPayModal({
                      invoiceId: '', invoiceNumber: '',
                      partyId: c.customer_id, partyName: c.customer_name,
                      partyType: 'customer', paymentType: 'sale',
                      remaining: Number(c.balance),
                    })}
                  />
                ))
              )}
            </div>
          </div>
        </div>

        {/* Recent Devices + Low Stock stacked */}
        <div className="space-y-4">

          {/* Recent Devices */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
            <SectionHeader title="آخر الأجهزة المضافة" sub="أحدث 5 أجهزة" to="/devices" navigate={navigate} />
            {devLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="py-2.5 border-b border-gray-100 dark:border-gray-800 last:border-0 flex items-center gap-3">
                  <div className="flex-1 space-y-1.5">
                    <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-3/4" />
                    <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-1/2" />
                  </div>
                  <div className="h-6 w-20 bg-gray-100 dark:bg-gray-800 rounded-full animate-pulse" />
                </div>
              ))
            ) : recentDevices.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-gray-400 dark:text-gray-600">
                <Smartphone size={28} className="mb-2 opacity-30" />
                <p className="text-sm">لم يتم إضافة أجهزة بعد</p>
              </div>
            ) : (
              recentDevices.map(d => <DeviceRow key={d.id} d={d} />)
            )}
          </div>

          {/* Low Stock */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
            <SectionHeader title="تنبيهات المخزون" sub="منتجات وصلت لحد إعادة الطلب" to="/products" navigate={navigate} />
            {lowLoad ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="py-2.5 border-b border-gray-100 dark:border-gray-800 last:border-0 flex items-center gap-3">
                  <div className="flex-1 space-y-1.5">
                    <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-3/4" />
                    <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-1/2" />
                  </div>
                  <div className="h-6 w-16 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                </div>
              ))
            ) : lowStockItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-gray-400 dark:text-gray-600">
                <CheckCircle size={28} className="mb-2 opacity-30 text-green-500" />
                <p className="text-sm text-green-600 dark:text-green-400 font-medium">المخزون في حالة جيدة</p>
              </div>
            ) : (
              lowStockItems.slice(0, 4).map(item => (
                <div key={item.product_id}
                  className="flex items-center justify-between py-2.5 border-b border-gray-100 dark:border-gray-800 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{item.product_name}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-600 mt-0.5">{item.category_name}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 mr-3">
                    <div className="text-center">
                      <p className="text-xs text-gray-400 dark:text-gray-600">متبقي</p>
                      <p className={cn('text-sm font-bold', item.stock_qty === 0 ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400')}>
                        {item.stock_qty}
                      </p>
                    </div>
                    <Badge variant={item.stock_qty === 0 ? 'danger' : 'warning'} dot>
                      {item.stock_qty === 0 ? 'نفد' : 'منخفض'}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Modals ── */}
      {showScan && <QuickScanModal onClose={() => setShowScan(false)} />}
      {payModal && (
        <AddPaymentModal
          invoiceId={payModal.invoiceId}
          invoiceNumber={payModal.invoiceNumber}
          partyId={payModal.partyId}
          partyName={payModal.partyName}
          partyType={payModal.partyType}
          paymentType={payModal.paymentType}
          remaining={payModal.remaining}
          onClose={() => setPayModal(null)}
        />
      )}
    </div>
  )
}
