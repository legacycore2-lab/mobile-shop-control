// src/pages/catalog/CatalogPage.tsx
// صفحة عامة (بدون تسجيل دخول) — عرض البضاعة المتاحة وإرسال طلب
import { useMemo, useState } from 'react'
import { Search, ShoppingCart, Store, CheckCircle, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useCatalogEntries } from '@/hooks/useCatalog'
import { useCart } from '@/hooks/useCart'
import { CatalogItemCard } from './CatalogItemCard'
import { CartPanel } from './CartPanel'
import type { CatalogGroup } from '@/services/catalog.service'
import type { CatalogOrderResult } from '@/types/database'

type Filter = 'all' | CatalogGroup

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all',        label: 'الكل'        },
  { id: 'device',     label: 'موبايلات'    },
  { id: 'accessory',  label: 'إكسسوارات'   },
  { id: 'spare_part', label: 'قطع غيار'    },
]

export function CatalogPage() {
  const { entries, isLoading, isError, refetch } = useCatalogEntries()
  const cart = useCart()
  const [filter,   setFilter]   = useState<Filter>('all')
  const [search,   setSearch]   = useState('')
  const [showCart, setShowCart] = useState(false)
  const [done,     setDone]     = useState<CatalogOrderResult | null>(null)

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return entries.filter(e =>
      (filter === 'all' || e.group === filter) &&
      (!q || `${e.title} ${e.subtitle} ${e.details.join(' ')}`.toLowerCase().includes(q)),
    )
  }, [entries, filter, search])

  const qtyInCart = (key: string) => cart.lines.find(l => l.key === key)?.quantity ?? 0

  function handleSuccess(result: CatalogOrderResult) {
    cart.clear()
    setShowCart(false)
    setDone(result)
  }

  if (done) return (
    <div dir="rtl" className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-8 max-w-sm w-full text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
          <CheckCircle size={28} className="text-green-600 dark:text-green-400" />
        </div>
        <h1 className="text-lg font-bold text-gray-900 dark:text-white">تم استلام طلبك</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">رقم الطلب</p>
        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400" dir="ltr">{done.order_number}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">هنتواصل معاك على رقمك لتأكيد الطلب</p>
        <button onClick={() => setDone(null)}
          className="w-full h-10 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold">
          العودة للمعرض
        </button>
      </div>
    </div>
  )

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50 dark:bg-gray-950">

      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <Store size={18} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900 dark:text-white">الشافعي ستور</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">البضاعة المتاحة</p>
          </div>
          <button onClick={() => setShowCart(true)} disabled={cart.count === 0}
            className="relative h-9 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-50">
            <ShoppingCart size={16} />
            <span className="hidden sm:inline">السلة</span>
            {cart.count > 0 && (
              <span className="min-w-[20px] h-5 px-1 rounded-full bg-white text-blue-700 text-xs font-bold flex items-center justify-center">
                {cart.count}
              </span>
            )}
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-5 space-y-4">

        <div className="relative">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحث عن موبايل أو إكسسوار..."
            className="w-full h-11 pr-10 pl-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {FILTERS.map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className={cn(
                'h-9 px-4 rounded-full text-sm font-medium whitespace-nowrap border transition-colors',
                filter === f.id
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700',
              )}>
              {f.label}
            </button>
          ))}
        </div>

        {isLoading && (
          <div className="flex justify-center py-16">
            <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {isError && (
          <div className="text-center py-16 space-y-3">
            <p className="text-sm text-gray-500 dark:text-gray-400">تعذّر تحميل البضاعة</p>
            <button onClick={() => void refetch()}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-200">
              <RefreshCw size={14} /> حاول تاني
            </button>
          </div>
        )}

        {!isLoading && !isError && visible.length === 0 && (
          <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-16">مفيش نتائج</p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {visible.map(e => (
            <CatalogItemCard key={e.key} entry={e} inCartQty={qtyInCart(e.key)} onAdd={() => cart.add(e)} />
          ))}
        </div>
      </main>

      {showCart && cart.lines.length > 0 && (
        <CartPanel
          lines={cart.lines}
          total={cart.total}
          onChange={cart.change}
          onRemove={cart.remove}
          onClose={() => setShowCart(false)}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  )
}
