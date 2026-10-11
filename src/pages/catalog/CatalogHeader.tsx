// src/pages/catalog/CatalogHeader.tsx
import { Search, ShoppingCart, PackageSearch } from 'lucide-react'
import { BrandWordmark } from './BrandWordmark'

interface Props {
  search:      string
  onSearch:    (value: string) => void
  cartCount:   number
  onOpenCart:  () => void
  onTrack:     () => void
}

export function CatalogHeader({ search, onSearch, cartCount, onOpenCart, onTrack }: Props) {
  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-7 py-3 flex items-center gap-3 sm:gap-5 flex-wrap">
        <BrandWordmark />

        <div className="order-3 sm:order-none flex-1 basis-full sm:basis-64 min-w-0 relative">
          <Search size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            value={search}
            onChange={e => onSearch(e.target.value)}
            placeholder="ابحث عن موبايل أو إكسسوار..."
            className="w-full h-11 pr-11 pl-4 rounded-xl bg-slate-100 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 text-sm text-gray-900 dark:text-gray-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          onClick={onTrack}
          className="mr-auto sm:mr-0 h-11 px-4 rounded-xl border border-slate-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-gray-800"
        >
          <PackageSearch size={16} />
          <span className="hidden sm:inline">تتبّع طلبك</span>
        </button>

        <button
          onClick={onOpenCart}
          disabled={cartCount === 0}
          className="h-11 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-50 transition-colors"
        >
          <ShoppingCart size={16} />
          السلة
          {cartCount > 0 && (
            <span className="min-w-[20px] h-5 px-1 rounded-full bg-white text-blue-700 text-xs font-bold flex items-center justify-center">
              {cartCount}
            </span>
          )}
        </button>
      </div>
    </header>
  )
}
