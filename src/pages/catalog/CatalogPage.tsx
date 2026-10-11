// src/pages/catalog/CatalogPage.tsx
// صفحة عامة (بدون تسجيل دخول) — عرض البضاعة المتاحة وإرسال طلب
import { useMemo, useState } from 'react'
import { CheckCircle, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useCatalogEntries, useCatalogAnalytics } from '@/hooks/useCatalog'
import { useCart } from '@/hooks/useCart'
import { CatalogHeader } from './CatalogHeader'
import { CatalogHero } from './CatalogHero'
import { CatalogItemCard } from './CatalogItemCard'
import { CatalogInfo } from './CatalogInfo'
import { CartPanel } from './CartPanel'
import { BrandMark } from './BrandMark'
import { PriceFilter } from './PriceFilter'
import { SortSelect } from './SortSelect'
import { ContactButtons } from './ContactButtons'
import { CatalogDetailModal } from './CatalogDetailModal'
import { CompareModal } from './CompareModal'
import { TrackOrderModal } from './TrackOrderModal'
import { ReviewsSection } from './ReviewsSection'
import { useFavorites } from '@/hooks/useFavorites'
import { catalogService, type CatalogGroup, type CatalogSort, type CatalogEntry } from '@/services/catalog.service'
import type { CatalogOrderResult } from '@/types/database'

type Filter = 'all' | 'favorites' | CatalogGroup

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all',        label: 'الكل'        },
  { id: 'device',     label: 'موبايلات'    },
  { id: 'accessory',  label: 'إكسسوارات'   },
  { id: 'spare_part', label: 'قطع غيار'    },
  { id: 'favorites',  label: 'المفضلة'     },
]

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export function CatalogPage() {
  const { entries, store, reviews, isLoading, isError, refetch } = useCatalogEntries()
  const cart = useCart()
  const favorites = useFavorites()
  const logView = useCatalogAnalytics()
  const [filter,   setFilter]   = useState<Filter>('all')
  const [search,   setSearch]   = useState(() => new URLSearchParams(window.location.search).get('q') ?? '')
  const [sort,     setSort]     = useState<CatalogSort>('default')
  const [openKey,  setOpenKey]  = useState<string | null>(null)
  const [compareKeys, setCompareKeys] = useState<string[]>([])
  const [showCompare, setShowCompare] = useState(false)
  const [track,    setTrack]    = useState<{ number: string } | null>(null)
  const [brand,    setBrand]    = useState<string | null>(null)
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [showCart, setShowCart] = useState(false)
  const [done,     setDone]     = useState<CatalogOrderResult | null>(null)

  const brands = useMemo(() => catalogService.brandCounts(entries), [entries])

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return catalogService.sort(entries, sort).filter(e =>
      (filter === 'all' || (filter === 'favorites' ? favorites.has(e.key) : e.group === filter)) &&
      (!brand || e.brand === brand) &&
      catalogService.inPriceRange(e, minPrice, maxPrice) &&
      (!q || `${e.title} ${e.subtitle} ${e.details.join(' ')}`.toLowerCase().includes(q)),
    )
  }, [entries, filter, brand, search, minPrice, maxPrice, sort, favorites.keys])

  const opened         = entries.find(e => e.key === openKey) ?? null

  function handleOpen(entry: CatalogEntry) {
    setOpenKey(entry.key)
    logView(entry.title)
  }
  const compareEntries = compareKeys
    .map(k => entries.find(e => e.key === k))
    .filter((e): e is CatalogEntry => !!e)

  function toggleCompare(key: string) {
    setCompareKeys(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])
  }

  const qtyInCart = (key: string) => cart.lines.find(l => l.key === key)?.quantity ?? 0

  function handleFilter(next: Filter) {
    setFilter(next)
    if (next !== 'device') setBrand(null)
  }

  function handlePickBrand(picked: string) {
    setFilter('device')
    setBrand(picked)
    setSearch('')
    scrollToId('catalog')
  }

  function handleSuccess(result: CatalogOrderResult) {
    cart.clear()
    setShowCart(false)
    setDone(result)
  }

  if (done) return (
    <div dir="rtl" className="min-h-screen bg-[#F5F7FB] dark:bg-gray-950 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-3xl p-8 max-w-sm w-full text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto">
          <CheckCircle size={28} className="text-emerald-600 dark:text-emerald-400" />
        </div>
        <h1 className="text-lg font-bold text-gray-900 dark:text-white">تم استلام طلبك</h1>
        <p className="text-sm text-slate-500 dark:text-gray-400">رقم الطلب</p>
        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400" dir="ltr">{done.order_number}</p>
        <p className="text-sm text-slate-500 dark:text-gray-400">هنتواصل معاك على رقمك لتأكيد الطلب</p>
        <button onClick={() => { setTrack({ number: done.order_number }); setDone(null) }}
          className="w-full h-11 rounded-xl border border-slate-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-sm font-semibold">
          تتبّع الطلب
        </button>
        <button onClick={() => setDone(null)}
          className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold">
          العودة للمعرض
        </button>
      </div>
    </div>
  )

  return (
    <div dir="rtl" className="min-h-screen bg-[#F5F7FB] dark:bg-gray-950">
      <CatalogHeader
        search={search}
        onSearch={setSearch}
        cartCount={cart.count}
        onOpenCart={() => setShowCart(true)}
        onTrack={() => setTrack({ number: '' })}
      />

      <CatalogHero
        brands={brands}
        onPickBrand={handlePickBrand}
        onBrowse={() => scrollToId('catalog')}
        onHowTo={() => scrollToId('how')}
      />

      <section id="catalog" className="max-w-6xl mx-auto px-4 sm:px-7 pt-9 space-y-5 scroll-mt-20">
        <div className="flex gap-3 overflow-x-auto pb-1">
          {FILTERS.map(f => (
            <button key={f.id} onClick={() => handleFilter(f.id)}
              className={cn(
                'h-10 px-6 rounded-full text-sm font-medium whitespace-nowrap border transition-colors',
                filter === f.id
                  ? 'bg-blue-600 text-white border-blue-600 font-semibold'
                  : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-slate-200 dark:border-gray-700',
              )}>
              {f.label}
            </button>
          ))}
        </div>

        {filter === 'device' && brands.length > 0 && (
          <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
            <span className="text-sm text-slate-500 dark:text-gray-400 whitespace-nowrap">الماركة:</span>
            {[{ brand: null, count: 0 }, ...brands].map(b => (
              <button key={b.brand ?? 'all'} onClick={() => setBrand(b.brand)} dir={b.brand ? 'ltr' : 'rtl'}
                className={cn(
                  'h-10 px-4 rounded-full text-sm whitespace-nowrap border transition-colors flex items-center gap-2',
                  brand === b.brand
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white font-semibold'
                    : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-slate-200 dark:border-gray-700',
                )}>
                {b.brand && <BrandMark brand={b.brand} size="sm" />}
                {b.brand ?? 'كل الماركات'}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-x-6 gap-y-3 flex-wrap">
          <PriceFilter
            min={minPrice} max={maxPrice}
            onChange={(lo, hi) => { setMinPrice(lo); setMaxPrice(hi) }}
          />
          <SortSelect value={sort} onChange={setSort} />
        </div>

        {isLoading && (
          <div className="flex justify-center py-16">
            <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {isError && (
          <div className="text-center py-16 space-y-3">
            <p className="text-sm text-slate-500 dark:text-gray-400">تعذّر تحميل البضاعة</p>
            <button onClick={() => void refetch()}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-lg border border-slate-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-200">
              <RefreshCw size={14} /> حاول تاني
            </button>
          </div>
        )}

        {!isLoading && !isError && visible.length === 0 && (
          <p className="text-center text-sm text-slate-500 dark:text-gray-400 py-16">مفيش نتائج</p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-[18px]">
          {visible.map(e => (
            <CatalogItemCard
              key={e.key} entry={e} inCartQty={qtyInCart(e.key)} onAdd={() => cart.add(e)}
              onOpen={() => handleOpen(e)}
              favorite={{ active: favorites.has(e.key), onToggle: () => favorites.toggle(e.key) }}
              compare={e.kind === 'device' ? {
                active:   compareKeys.includes(e.key),
                disabled: compareKeys.length >= 3,
                onToggle: () => toggleCompare(e.key),
              } : null}
            />
          ))}
        </div>
      </section>

      <ReviewsSection reviews={reviews} />

      <CatalogInfo store={store} />

      <ContactButtons store={store} />

      {compareEntries.length > 0 && (
        <div className="fixed bottom-5 right-1/2 translate-x-1/2 z-40 bg-slate-900 text-white rounded-full shadow-lg pl-2 pr-5 h-12 flex items-center gap-3 text-sm">
          <span>{compareEntries.length} للمقارنة</span>
          <button onClick={() => setShowCompare(true)} disabled={compareEntries.length < 2}
            className="h-8 px-4 rounded-full bg-blue-600 disabled:bg-slate-600 font-semibold">
            {compareEntries.length < 2 ? 'اختار موبايل تاني' : 'قارن'}
          </button>
          <button onClick={() => setCompareKeys([])} className="h-8 px-3 text-slate-300">مسح</button>
        </div>
      )}

      {opened && (
        <CatalogDetailModal
          entry={opened}
          inCartQty={qtyInCart(opened.key)}
          store={store}
          onAdd={() => cart.add(opened)}
          onClose={() => setOpenKey(null)}
        />
      )}

      {track && <TrackOrderModal initialNumber={track.number} onClose={() => setTrack(null)} />}

      {showCompare && compareEntries.length >= 2 && (
        <CompareModal entries={compareEntries} onClose={() => setShowCompare(false)} />
      )}

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
