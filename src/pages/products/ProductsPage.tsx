// src/pages/products/ProductsPage.tsx
import { useState, useMemo } from 'react'
import {
  Search, Download, Package, Tag,
  AlertTriangle, TrendingUp, Archive,
  Eye, Pencil, Trash2, ChevronLeft, ChevronRight, DollarSign,
  CheckCircle,
  ScanLine,
} from "lucide-react"
import {
  useProducts, useProductStats,
  useDeleteProduct,
} from '@/hooks/useProducts'
import { Badge } from '@/components/ui/Badge'
import { StatCard } from '@/components/shared/StatCard'
import { cn } from '@/lib/cn'
import { exportToCsv, PRODUCT_EXPORT_HEADERS } from '@/lib/exportUtils'
import { BarcodeScanner } from '@/components/shared/BarcodeScanner'
import { ProductModal } from './ProductModal'
import { ProductDrawer } from './ProductDrawer'
import { TYPE_MAP, PAGE_SIZE, fmt, type FilterType } from './constants'
import type { ProductWithCategory } from '@/repositories/products.repository'

export function ProductsPage() {
  const { data: products  = [], isLoading } = useProducts()
  const { data: stats }                     = useProductStats()
  const deleteMutation                      = useDeleteProduct()

  const [search,    setSearch]    = useState('')
  const [filter,    setFilter]    = useState<FilterType>('all')
  const [page,      setPage]      = useState(1)
  const [modal,     setModal]     = useState<'edit' | null>(null)
  const [selected,  setSelected]  = useState<ProductWithCategory | null>(null)
  const [scanner,   setScanner]   = useState(false)
  const [drawer,    setDrawer]    = useState<ProductWithCategory | null>(null)

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return products.filter(p => {
      const matchSearch = !q ||
        p.name.toLowerCase().includes(q) ||
        (p.sku ?? '').toLowerCase().includes(q) ||
        (p.barcode ?? '').toLowerCase().includes(q) ||
        p.category_name.toLowerCase().includes(q)
      const matchFilter =
        filter === 'all'       ? true :
        filter === 'low_stock' ? p.stock_qty <= p.reorder_level :
        filter === 'inactive'  ? !p.is_active :
        p.product_type === filter
      return matchSearch && matchFilter
    })
  }, [products, search, filter])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function openEdit(p: ProductWithCategory) { setSelected(p); setModal('edit') }
  function closeModal() { setModal(null); setSelected(null) }

  async function handleDelete(id: string) {
    if (!confirm('هل أنت متأكد من حذف هذا المنتج؟')) return
    await deleteMutation.mutateAsync(id)
  }

  const STATS_CONFIG = [
    { label: 'إجمالي المنتجات', value: stats?.total       ?? 0, icon: Package,       colorClass: 'text-blue-600 dark:text-blue-400',   bgClass: 'bg-blue-50 dark:bg-blue-900/20'   },
    { label: 'إكسسوارات',       value: stats?.accessories  ?? 0, icon: Tag,           colorClass: 'text-purple-600 dark:text-purple-400', bgClass: 'bg-purple-50 dark:bg-purple-900/20' },
    { label: 'قطع غيار',        value: stats?.spareParts   ?? 0, icon: Archive,       colorClass: 'text-amber-600 dark:text-amber-400',  bgClass: 'bg-amber-50 dark:bg-amber-900/20'  },
    { label: 'مخزون منخفض',     value: stats?.lowStock     ?? 0, icon: AlertTriangle, colorClass: 'text-red-600 dark:text-red-400',      bgClass: 'bg-red-50 dark:bg-red-900/20'      },
    {
      label: 'قيمة المخزون (شراء)',
      value: `${fmt(stats?.totalCostValue ?? 0)} ج`,
      sub: `بيع: ${fmt(stats?.totalSellingValue ?? 0)} ج`,
      icon: DollarSign,
      colorClass: 'text-green-600 dark:text-green-400',
      bgClass: 'bg-green-50 dark:bg-green-900/20',
    },
    { label: 'منتجات نشطة', value: stats?.active ?? 0, icon: CheckCircle, colorClass: 'text-teal-600 dark:text-teal-400', bgClass: 'bg-teal-50 dark:bg-teal-900/20' },
  ]

  const FILTER_TABS: { value: FilterType; label: string }[] = [
    { value: 'all',        label: 'الكل'          },
    { value: 'accessory',  label: 'إكسسوارات'    },
    { value: 'spare_part', label: 'قطع غيار'     },
    { value: 'low_stock',  label: 'مخزون منخفض'  },
    { value: 'inactive',   label: 'غير نشط'       },
  ]

  return (
    <div className="max-w-7xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">المنتجات</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">إكسسوارات وقطع الغيار — يُضاف المخزون عبر المشتريات</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => exportToCsv('products', PRODUCT_EXPORT_HEADERS, filtered)} className="h-9 px-4 text-sm font-medium rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-2">
            <Download size={14} /> تصدير
          </button>
          <button onClick={() => setScanner(true)}
            className="h-9 px-4 text-sm font-medium rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-2">
            <ScanLine size={14} /> مسح
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {STATS_CONFIG.map(s => <StatCard key={s.label} {...s} />)}
      </div>

      {/* Toolbar */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="بحث بالاسم، SKU، الباركود، التصنيف..."
            className="w-full h-9 pr-9 pl-3 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {FILTER_TABS.map(({ value, label }) => (
            <button key={value} onClick={() => { setFilter(value); setPage(1) }}
              className={cn(
                'h-8 px-3 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap',
                filter === value
                  ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400'
                  : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700',
              )}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                {['#', 'المنتج', 'التصنيف', 'النوع', 'SKU', 'سعر الشراء', 'سعر البيع', 'المخزون', 'الحالة', 'إجراءات'].map((h, i) => (
                  <th key={h} className={cn(
                    'px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap text-right',
                    i >= 5 && 'text-center',
                  )}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-100 dark:border-gray-800">
                    {Array.from({ length: 10 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-16 text-center text-gray-400 dark:text-gray-600">
                    <Package size={32} className="mx-auto mb-2 opacity-30" />
                    <p>لا توجد منتجات — يُضاف المخزون عبر فواتير المشتريات</p>
                  </td>
                </tr>
              ) : paginated.map((p, i) => {
                const isLow = p.stock_qty <= p.reorder_level
                return (
                  <tr key={p.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-3 text-xs text-gray-400 dark:text-gray-600 font-mono">
                      {String((page - 1) * PAGE_SIZE + i + 1).padStart(2, '0')}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900 dark:text-white">{p.name}</p>
                      {p.supplier_name && <p className="text-xs text-gray-400 dark:text-gray-600 mt-0.5">{p.supplier_name}</p>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      {p.category_name}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={TYPE_MAP[p.product_type].variant}>
                        {TYPE_MAP[p.product_type].label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500 dark:text-gray-500">
                      {p.sku ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-center text-sm font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                      {fmt(p.cost_price)} ج
                    </td>
                    <td className="px-4 py-3 text-center text-sm font-semibold text-green-600 dark:text-green-400 whitespace-nowrap">
                      {fmt(p.selling_price)} ج
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn(
                        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border',
                        isLow
                          ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800'
                          : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700',
                      )}>
                        {isLow && <AlertTriangle size={11} />}
                        {p.stock_qty} {p.unit}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border',
                        p.is_active
                          ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-500 border-gray-200 dark:border-gray-700')}>
                        <span className={cn('w-1.5 h-1.5 rounded-full', p.is_active ? 'bg-green-500' : 'bg-gray-400')} />
                        {p.is_active ? 'نشط' : 'موقوف'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 justify-center">
                        <button title="عرض التفاصيل" onClick={() => setDrawer(p)}
                          className="w-7 h-7 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                          <Eye size={13} />
                        </button>
                        <button title="تعديل بيانات المنتج" onClick={() => openEdit(p)}
                          className="w-7 h-7 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-200 dark:hover:border-blue-800 transition-colors">
                          <Pencil size={13} />
                        </button>
                        <button title="حذف" onClick={() => void handleDelete(p.id)}
                          disabled={deleteMutation.isPending}
                          className="w-7 h-7 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-800 transition-colors disabled:opacity-50">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            عرض <span className="font-semibold text-gray-900 dark:text-white">{filtered.length}</span> من{' '}
            <span className="font-semibold text-gray-900 dark:text-white">{products.length}</span> منتج
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

      {/* Modals */}
      {modal === 'edit' && selected && <ProductModal product={selected} onClose={closeModal} />}
      {drawer && <ProductDrawer product={drawer} onClose={() => setDrawer(null)} />}
      {scanner && (
        <BarcodeScanner
          title="مسح باركود المنتج"
          placeholder="باركود أو SKU..."
          onScan={code => { setSearch(code); setScanner(false) }}
          onClose={() => setScanner(false)}
        />
      )}
    </div>
  )
}
