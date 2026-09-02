// src/pages/pos/PosPage.tsx
import { useState, useMemo } from 'react'
import {
  Search, Plus, ShoppingCart, DollarSign,
  CheckCircle, Clock, XCircle, TrendingUp, Users,
  ChevronLeft, ChevronRight, Trash2, Eye, CreditCard, Smartphone, Tag,
} from 'lucide-react'
import {
  useSaleInvoices, useSaleStats,
  useConfirmSale, useCancelSale, useDeleteSale,
} from '@/hooks/usePos'
import { Badge } from '@/components/ui/Badge'
import { StatCard } from '@/components/shared/StatCard'
import { cn } from '@/lib/cn'
import { SaleDrawer }       from './SaleDrawer'
import { CreateSaleModal }  from './CreateSaleModal'
import { STATUS_MAP, PAGE_SIZE, fmt, type FilterStatus } from './constants'
import type { SaleInvoiceView } from '@/repositories/pos.repository'

export function PosPage() {
  const { data: invoices = [], isLoading } = useSaleInvoices()
  const { data: stats }                    = useSaleStats()
  const deleteMutation                     = useDeleteSale()

  const [search,     setSearch]     = useState('')
  const [filter,     setFilter]     = useState<FilterStatus>('all')
  const [page,       setPage]       = useState(1)
  const [showCreate, setShowCreate] = useState(false)
  const [detailId,   setDetailId]   = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return invoices.filter(inv => {
      const matchSearch = !q ||
        inv.invoice_number.toLowerCase().includes(q) ||
        (inv.customer_name ?? '').toLowerCase().includes(q)
      const matchFilter = filter === 'all' || inv.status === filter
      return matchSearch && matchFilter
    })
  }, [invoices, search, filter])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  async function handleDelete(inv: SaleInvoiceView) {
    if (inv.status === 'confirmed') return
    if (!confirm('هل أنت متأكد من حذف هذه الفاتورة؟')) return
    await deleteMutation.mutateAsync(inv.id)
  }

  const STATS = [
    { label: 'فواتير البيع',    value: stats?.total       ?? 0, sub: `${stats?.confirmed ?? 0} مؤكدة`, icon: ShoppingCart, color: 'blue'   as const },
    { label: 'مسودات',          value: stats?.draft       ?? 0, icon: Clock,       color: 'amber'  as const },
    { label: 'إجمالي المبيعات', value: `${fmt(stats?.totalRevenue ?? 0)} ج`, sub: 'من الفواتير المؤكدة', icon: TrendingUp,  color: 'green'  as const },
    { label: 'المتبقي للتحصيل', value: `${fmt(stats?.totalDue ?? 0)} ج`, sub: `مدفوع: ${fmt(stats?.totalPaid ?? 0)} ج`, icon: CreditCard, color: (stats?.totalDue ?? 0) > 0 ? 'red' as const : 'teal' as const },
  ]

  const FILTER_TABS: { value: FilterStatus; label: string }[] = [
    { value: 'all',       label: 'الكل'   },
    { value: 'draft',     label: 'مسودات' },
    { value: 'confirmed', label: 'مؤكدة'  },
    { value: 'cancelled', label: 'ملغاة'  },
  ]

  return (
    <div className="max-w-7xl mx-auto space-y-5">

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">نقطة البيع</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">فواتير البيع وإدارة المبيعات</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="h-9 px-4 text-sm font-semibold rounded-lg bg-green-600 hover:bg-green-700 text-white transition-colors flex items-center gap-2">
          <Plus size={14} /> فاتورة بيع جديدة
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {STATS.map(s => <StatCard key={s.label} {...s} />)}
      </div>

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="بحث برقم الفاتورة أو اسم العميل..."
            className="w-full h-9 pr-9 pl-3 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {FILTER_TABS.map(({ value, label }) => (
            <button key={value} onClick={() => { setFilter(value); setPage(1) }}
              className={cn('h-8 px-3 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap',
                filter === value
                  ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400'
                  : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700')}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                {['رقم الفاتورة', 'العميل', 'التاريخ', 'أجهزة', 'منتجات', 'الإجمالي', 'المدفوع', 'المتبقي', 'الحالة', ''].map((h, i) => (
                  <th key={i} className={cn('px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap text-right', i >= 3 && 'text-center')}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-100 dark:border-gray-800">
                    {Array.from({ length: 10 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-16 text-center text-gray-400 dark:text-gray-600">
                    <ShoppingCart size={32} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm">لا توجد فواتير بيع</p>
                    <button onClick={() => setShowCreate(true)}
                      className="mt-3 text-xs text-blue-600 dark:text-blue-400 hover:underline">
                      إنشاء فاتورة جديدة
                    </button>
                  </td>
                </tr>
              ) : paginated.map(inv => (
                <tr key={inv.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-mono text-sm font-bold text-gray-900 dark:text-white">{inv.invoice_number}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-600 mt-0.5">{inv.created_by_name}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <Users size={12} className="text-gray-400 dark:text-gray-600 flex-shrink-0" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{inv.customer_name ?? 'نقدي'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                    {new Date(inv.invoice_date).toLocaleDateString('ar-EG')}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400">
                      <Smartphone size={11} /> {inv.devices_count}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-purple-600 dark:text-purple-400">
                      <Tag size={11} /> {inv.products_count}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-sm font-bold text-gray-900 dark:text-white whitespace-nowrap">
                    {fmt(inv.total_amount)} ج
                  </td>
                  <td className="px-4 py-3 text-center text-sm font-semibold text-green-600 dark:text-green-400 whitespace-nowrap">
                    {fmt(inv.paid_amount)} ج
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={cn('text-sm font-bold whitespace-nowrap',
                      inv.remaining > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-400 dark:text-gray-600')}>
                      {fmt(inv.remaining)} ج
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={STATUS_MAP[inv.status]?.variant ?? 'neutral'}>
                      {STATUS_MAP[inv.status]?.label}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-center">
                      <button title="عرض" onClick={() => setDetailId(inv.id)}
                        className="w-7 h-7 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <Eye size={13} />
                      </button>
                      {inv.status === 'draft' && (
                        <button title="حذف" onClick={() => void handleDelete(inv)}
                          disabled={deleteMutation.isPending}
                          className="w-7 h-7 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-800 transition-colors disabled:opacity-50">
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            عرض <span className="font-semibold text-gray-900 dark:text-white">{filtered.length}</span> من{' '}
            <span className="font-semibold text-gray-900 dark:text-white">{invoices.length}</span> فاتورة
          </p>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 transition-colors">
                <ChevronRight size={14} />
              </button>
              <span className="text-sm text-gray-700 dark:text-gray-300 px-2">{page} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 transition-colors">
                <ChevronLeft size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      {showCreate && <CreateSaleModal onClose={() => setShowCreate(false)} />}
      {detailId   && <SaleDrawer invoiceId={detailId} onClose={() => setDetailId(null)} />}
    </div>
  )
}

