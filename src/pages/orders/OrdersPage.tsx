// src/pages/orders/OrdersPage.tsx
import { useMemo, useState } from 'react'
import { Search, Link2, Check, ClipboardList } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/cn'
import { fmt } from '@/lib/fmt'
import { useAuth } from '@/lib/auth'
import { usePermissions } from '@/hooks/usePermissions'
import { useCatalogOrders, useUpdateOrderStatus } from '@/hooks/useCatalogOrders'
import { OrderDrawer } from './OrderDrawer'
import { CatalogReportPanel } from './CatalogReportPanel'
import { ReviewsPanel } from './ReviewsPanel'
import { topOrderedItems } from '@/services/catalogOrders.service'
import { ORDER_FILTERS, ORDER_STATUS_MAP, fmtOrderDate, type OrderFilter } from './constants'
import type { CatalogOrderStatus } from '@/types/database'

export function OrdersPage() {
  const { session } = useAuth()
  const perm        = usePermissions()
  const { data: orders = [], isLoading } = useCatalogOrders()
  const update = useUpdateOrderStatus()

  const [filter,     setFilter]     = useState<OrderFilter>('all')
  const [search,     setSearch]     = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [copied,     setCopied]     = useState(false)

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return orders.filter(o =>
      (filter === 'all' || o.status === filter) &&
      (!q || `${o.order_number} ${o.customer_name} ${o.customer_phone}`.toLowerCase().includes(q)),
    )
  }, [orders, filter, search])

  const top      = useMemo(() => topOrderedItems(orders), [orders])
  const selected = orders.find(o => o.id === selectedId) ?? null
  const countOf  = (f: OrderFilter) => f === 'all' ? orders.length : orders.filter(o => o.status === f).length

  async function copyLink() {
    const url = `${window.location.origin}${import.meta.env.BASE_URL}catalog`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* ignore */ }
  }

  function handleChangeStatus(status: CatalogOrderStatus) {
    if (!selected || !session) return
    update.mutate({ id: selected.id, status, userId: session.user.id })
  }

  return (
    <div className="p-4 lg:p-6 space-y-4" dir="rtl">

      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">طلبات العملاء</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">الطلبات اللي جت من صفحة المعرض العامة</p>
        </div>
        <button onClick={() => void copyLink()}
          className="h-9 px-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-200 flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700">
          {copied ? <><Check size={14} className="text-green-600" /> تم النسخ</> : <><Link2 size={14} /> نسخ رابط المعرض</>}
        </button>
      </div>

      <CatalogReportPanel />

      <ReviewsPanel canEdit={perm.canEdit('orders')} />

      {top.length > 0 && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
          <p className="text-sm font-bold text-gray-900 dark:text-white mb-3">الأكثر طلبًا من الكتالوج</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
            {top.map((t, i) => (
              <div key={t.name} className="rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800 px-3 py-2">
                <p className="text-xs text-gray-400">#{i + 1}</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{t.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t.quantity} قطعة · {t.orders} طلب</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-3 space-y-3">
        <div className="relative">
          <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث بالرقم أو الاسم أو الموبايل..."
            className="w-full h-9 pr-9 pl-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {ORDER_FILTERS.map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className={cn(
                'h-8 px-3 rounded-full text-xs font-medium whitespace-nowrap border transition-colors',
                filter === f.id
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700',
              )}>
              {f.label} ({countOf(f.id)})
            </button>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!isLoading && visible.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-16 text-gray-400 dark:text-gray-600">
          <ClipboardList size={36} className="opacity-40" />
          <p className="text-sm">مفيش طلبات</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {visible.map(o => {
          const st = ORDER_STATUS_MAP[o.status]
          return (
            <button key={o.id} onClick={() => setSelectedId(o.id)}
              className="text-right bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-blue-300 dark:hover:border-blue-700 rounded-xl p-4 space-y-2 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-gray-900 dark:text-white" dir="ltr">{o.order_number}</span>
                <Badge variant={st.variant}>{st.label}</Badge>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300">{o.customer_name}</p>
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>{o.items.length} صنف · {fmtOrderDate(o.created_at)}</span>
                <span className="text-sm font-bold text-gray-900 dark:text-white">{fmt(o.total)} ج</span>
              </div>
            </button>
          )
        })}
      </div>

      {selected && (
        <OrderDrawer
          order={selected}
          canEdit={perm.canEdit('orders')}
          saving={update.isPending}
          onChangeStatus={handleChangeStatus}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  )
}
