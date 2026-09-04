import { useMemo, useState } from 'react'
import {
  Smartphone, TrendingUp, AlertTriangle, Package,
  ArrowLeft, CheckCircle, Wrench, DollarSign, ScanLine,
  Users, Truck, BarChart2, RefreshCw,
} from 'lucide-react'
import { useDevices, useDeviceStats } from '@/hooks/useDevices'
import { useProductStats, useLowStockProducts } from '@/hooks/useProducts'
import { useSupplierStats } from '@/hooks/useSuppliers'
import { useCustomerStats } from '@/hooks/useCustomers'
import { Badge } from '@/components/ui/Badge'
import { useNavigate } from 'react-router-dom'
import { QuickScanModal } from './QuickScanModal'
import { cn } from '@/lib/cn'
import type { MobileDeviceView } from '@/types/database'
import { DEVICE_STATUS_MAP, CONDITION_MAP, fmt } from '@/constants/statusMaps'

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_MAP: Record<string, { label: string; variant: 'success' | 'info' | 'warning' | 'danger' | 'neutral' }> = {
  in_stock:       { label: 'في المخزون',  variant: 'success' },
  sold:           { label: 'مباع',        variant: 'info'    },
  returned:       { label: 'مُعاد',       variant: 'warning' },
  defective:      { label: 'تالف',        variant: 'danger'  },
  sent_to_repair: { label: 'في الصيانة', variant: 'warning' },
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, icon: Icon, color, onClick }: {
  label: string; value: string | number; sub?: string
  icon: React.ElementType
  color: 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'teal' | 'gray'
  onClick?: () => void
}) {
  const colorMap = {
    blue:   { bg: 'bg-blue-50   dark:bg-blue-900/20',   icon: 'text-blue-600   dark:text-blue-400',   border: 'border-blue-100   dark:border-blue-900'   },
    green:  { bg: 'bg-green-50  dark:bg-green-900/20',  icon: 'text-green-600  dark:text-green-400',  border: 'border-green-100  dark:border-green-900'  },
    amber:  { bg: 'bg-amber-50  dark:bg-amber-900/20',  icon: 'text-amber-600  dark:text-amber-400',  border: 'border-amber-100  dark:border-amber-900'  },
    red:    { bg: 'bg-red-50    dark:bg-red-900/20',    icon: 'text-red-600    dark:text-red-400',    border: 'border-red-100    dark:border-red-900'    },
    purple: { bg: 'bg-purple-50 dark:bg-purple-900/20', icon: 'text-purple-600 dark:text-purple-400', border: 'border-purple-100 dark:border-purple-900' },
    teal:   { bg: 'bg-teal-50   dark:bg-teal-900/20',   icon: 'text-teal-600   dark:text-teal-400',   border: 'border-teal-100   dark:border-teal-900'   },
    gray:   { bg: 'bg-gray-100  dark:bg-gray-800',      icon: 'text-gray-600   dark:text-gray-400',   border: 'border-gray-200   dark:border-gray-700'   },
  }
  const c = colorMap[color]
  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4',
        onClick && 'cursor-pointer hover:shadow-md hover:border-gray-300 dark:hover:border-gray-700 transition-all',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{label}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
          {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 truncate">{sub}</p>}
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
  title: string; sub: string; to: string
  navigate: ReturnType<typeof useNavigate>
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div>
        <h2 className="text-sm font-bold text-gray-900 dark:text-white">{title}</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{sub}</p>
      </div>
      <button onClick={() => navigate(to)}
        className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline">
        عرض الكل <ArrowLeft size={12} />
      </button>
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

// ── Main Dashboard ────────────────────────────────────────────────────────────

export function DashboardPage() {
  const navigate = useNavigate()
  const [showScan, setShowScan] = useState(false)

  const { data: devices        = [], isLoading: devLoading } = useDevices()
  const { data: deviceStats,         isLoading: devStatLoad } = useDeviceStats()
  const { data: productStats,        isLoading: prodStatLoad } = useProductStats()
  const { data: supplierStats,       isLoading: supStatLoad  } = useSupplierStats()
  const { data: customerStats,       isLoading: custStatLoad } = useCustomerStats()
  const { data: lowStockItems   = [], isLoading: lowLoad }    = useLowStockProducts()

  const recentDevices = useMemo(() =>
    [...devices].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5),
    [devices]
  )

  const soldToday = useMemo(() => {
    const today = new Date().toDateString()
    return devices.filter(d => d.status === 'sold' && d.sold_at && new Date(d.sold_at).toDateString() === today)
  }, [devices])

  const totalLoading = devLoading || devStatLoad || prodStatLoad || supStatLoad || custStatLoad

  // ── Inventory value
  const stockValue   = deviceStats?.totalCostValue    ?? 0
  const stockSelling = deviceStats?.totalSellingValue ?? 0
  const potentialProfit = stockSelling - stockValue

  return (
    <div className="max-w-7xl mx-auto space-y-6">

      {/* Page Header */}
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
              <RefreshCw size={12} className="animate-spin" />
              جاري التحديث...
            </div>
          )}
          <button
            onClick={() => setShowScan(true)}
            className="h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold flex items-center gap-2 transition-colors shadow-lg shadow-blue-600/25">
            <ScanLine size={16} /> مسح سريع
          </button>
        </div>
      </div>

      {/* ── KPI Row 1: Devices ── */}
      <div>
        <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
          <Smartphone size={12} /> الأجهزة
        </p>
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

      {/* ── KPI Row 2: Inventory Value ── */}
      <div>
        <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
          <DollarSign size={12} /> القيمة المالية (أجهزة في المخزون)
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <KpiCard
            label="إجمالي تكلفة الشراء"
            value={`${fmt(stockValue)} ج`}
            icon={DollarSign} color="gray"
          />
          <KpiCard
            label="إجمالي سعر البيع المقترح"
            value={`${fmt(stockSelling)} ج`}
            icon={BarChart2} color="teal"
          />
          <KpiCard
            label="الربح المتوقع"
            value={`${fmt(potentialProfit)} ج`}
            sub={stockValue > 0 ? `هامش ${((potentialProfit / stockValue) * 100).toFixed(1)}%` : undefined}
            icon={TrendingUp}
            color={potentialProfit >= 0 ? 'green' : 'red'}
          />
        </div>
      </div>

      {/* ── KPI Row 3: Products + Suppliers + Customers ── */}
      <div>
        <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
          <Package size={12} /> المنتجات والعلاقات
        </p>
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
            sub={productStats?.lowStock ? 'تحتاج إعادة طلب' : 'المخزون طبيعي'}
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

      {/* ── Bottom Row: Recent Devices + Low Stock ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Recent Devices */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
          <SectionHeader title="آخر الأجهزة المضافة" sub="أحدث 5 أجهزة في المخزون" to="/devices" navigate={navigate} />
          {devLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="py-2.5 border-b border-gray-100 dark:border-gray-800 last:border-0 flex items-center gap-3">
                <div className="flex-1 space-y-1.5">
                  <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-3/4" />
                  <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-1/2" />
                </div>
                <div className="h-6 w-20 bg-gray-100 dark:bg-gray-800 rounded-full animate-pulse" />
              </div>
            ))
          ) : recentDevices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-gray-400 dark:text-gray-600">
              <Smartphone size={32} className="mb-2 opacity-30" />
              <p className="text-sm">لم يتم إضافة أجهزة بعد</p>
              <button onClick={() => navigate('/devices')}
                className="mt-3 text-xs text-blue-600 dark:text-blue-400 hover:underline">
                إضافة جهاز جديد
              </button>
            </div>
          ) : (
            recentDevices.map(d => <DeviceRow key={d.id} d={d} />)
          )}
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
          <SectionHeader title="تنبيهات المخزون" sub="منتجات وصلت لحد إعادة الطلب" to="/products" navigate={navigate} />
          {lowLoad ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="py-2.5 border-b border-gray-100 dark:border-gray-800 last:border-0 flex items-center gap-3">
                <div className="flex-1 space-y-1.5">
                  <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-3/4" />
                  <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-1/2" />
                </div>
                <div className="h-6 w-16 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
              </div>
            ))
          ) : lowStockItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-gray-400 dark:text-gray-600">
              <CheckCircle size={32} className="mb-2 opacity-30 text-green-500" />
              <p className="text-sm text-green-600 dark:text-green-400 font-medium">المخزون في حالة جيدة</p>
              <p className="text-xs text-gray-400 dark:text-gray-600 mt-1">لا توجد منتجات منخفضة المخزون</p>
            </div>
          ) : (
            <div className="space-y-0">
              {lowStockItems.slice(0, 6).map(item => (
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
                    <div className="text-center">
                      <p className="text-xs text-gray-400 dark:text-gray-600">الحد</p>
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{item.reorder_level}</p>
                    </div>
                    <Badge variant={item.stock_qty === 0 ? 'danger' : 'warning'} dot>
                      {item.stock_qty === 0 ? 'نفد' : 'منخفض'}
                    </Badge>
                  </div>
                </div>
              ))}
              {lowStockItems.length > 6 && (
                <button onClick={() => navigate('/products')}
                  className="w-full pt-3 text-xs text-blue-600 dark:text-blue-400 hover:underline text-center">
                  عرض {lowStockItems.length - 6} منتج إضافي
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      {showScan && <QuickScanModal onClose={() => setShowScan(false)} />}
    </div>
  )
}
