// src/pages/catalog/CatalogHeader.tsx
import { Search, ShoppingCart, PackageSearch } from 'lucide-react'
import { BrandBanner } from './BrandBanner'

interface Props {
  search:      string
  onSearch:    (value: string) => void
  cartCount:   number
  onOpenCart:  () => void
  onTrack:     () => void
}

export function CatalogHeader({ search, onSearch, cartCount, onOpenCart, onTrack }: Props) {
  return (
    <>
      <BrandBanner />
      <header className="bg-white dark:bg-gray-900 border-b border-slate-200 dark:border-gray-800 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-7 py-3 flex items-center gap-3 sm:gap-6">
          <div className="flex-1 sm:flex-none sm:w-full sm:max-w-[560px] min-w-0 relative">
            <Search size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={e => onSearch(e.target.value)}
              aria-label="ابحث في الكتالوج"
              placeholder="ابحث عن موبايل أو إكسسوار..."
              className="w-full h-11 pr-11 pl-4 rounded-full bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 text-sm text-gray-900 dark:text-gray-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F2552]/30"
            />
          </div>

          <div className="flex items-center gap-2 sm:gap-5 mr-auto">
            <button
              onClick={onTrack}
              aria-label="تتبّع طلبك"
              className="h-11 w-11 sm:w-auto rounded-xl text-sm font-semibold text-[#0F2552] dark:text-gray-200 flex items-center justify-center gap-2 hover:bg-slate-100 dark:hover:bg-gray-800 sm:px-2"
            >
              <PackageSearch size={20} />
              <span className="hidden sm:inline">تتبّع طلبك</span>
            </button>

            <button
              onClick={onOpenCart}
              disabled={cartCount === 0}
              aria-label={`سلة المشتريات، ${cartCount} أصناف`}
              className="relative h-11 w-11 sm:w-auto rounded-xl text-sm font-semibold text-[#0F2552] dark:text-gray-200 flex items-center justify-center gap-2 hover:bg-slate-100 dark:hover:bg-gray-800 sm:px-2 disabled:opacity-60"
            >
              <ShoppingCart size={20} />
              <span className="hidden sm:inline">سلة المشتريات</span>
              {cartCount > 0 && (
                <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>
    </>
  )
}
