import { exportToCsv, PRODUCT_EXPORT_HEADERS } from '@/lib/exportUtils'
import { useState, useMemo } from 'react'
import {
  Search, Plus, Download, Package, Tag,
  AlertTriangle, TrendingUp, DollarSign, Archive,
  Eye, Pencil, Trash2, ChevronLeft, ChevronRight,
  X, Minus, BarChart2, CheckCircle,
} from 'lucide-react'
import {
  useProducts, useProductStats, useProductCategories,
  useCreateProduct, useUpdateProduct, useDeleteProduct,
  useAdjustStock, useCreateCategory, useDeleteCategory,
} from '@/hooks/useProducts'
import { useSuppliers } from '@/hooks/useSuppliers'
import { useAuth } from '@/lib/auth'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/cn'
import type { ProductWithCategory } from '@/repositories/products.repository'
import type { ProductType } from '@/types/database'

// ── Helpers ───────────────────────────────────────────────────────────────────

const TYPE_MAP: Record<ProductType, { label: string; variant: 'info' | 'warning' }> = {
  accessory:  { label: 'إكسسوار',   variant: 'info'    },
  spare_part: { label: 'قطعة غيار', variant: 'warning' },
}

const PAGE_SIZE = 10

type FilterType = 'all' | ProductType | 'low_stock' | 'inactive'

// ── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, colorClass, bgClass, sub }: {
  label: string; value: string | number; sub?: string
  icon: React.ElementType; colorClass: string; bgClass: string
}) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 flex items-center gap-4">
      <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0', bgClass)}>
        <Icon size={18} className={colorClass} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{label}</p>
        <p className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">{value}</p>
        {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">{sub}</p>}
      </div>
    </div>
  )
}

// ── Stock Adjust Modal ────────────────────────────────────────────────────────

function StockModal({ product, onClose }: { product: ProductWithCategory; onClose: () => void }) {
  const adjustMutation = useAdjustStock()
  const [qty,  setQty]  = useState('')
  const [mode, setMode] = useState<'add' | 'remove'>('add')
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const n = Number(qty)
    if (!n || n <= 0) { setError('أدخل كمية صحيحة أكبر من صفر'); return }
    setError('')
    try {
      await adjustMutation.mutateAsync({ id: product.id, delta: mode === 'add' ? n : -n })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <div>
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">تعديل المخزون</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{product.name}</p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
            <X size={14} />
          </button>
        </div>
        <form onSubmit={e => void handleSubmit(e)} className="px-5 py-4 flex flex-col gap-4">
          {/* Current stock */}
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 flex items-center justify-between">
            <span className="text-xs text-gray-500 dark:text-gray-400">المخزون الحالي</span>
            <span className={cn('text-lg font-bold', product.stock_qty <= product.reorder_level ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white')}>
              {product.stock_qty} {product.unit}
            </span>
          </div>
          {/* Mode */}
          <div className="grid grid-cols-2 gap-2">
            {([['add', 'إضافة'], ['remove', 'خصم']] as const).map(([v, l]) => (
              <button key={v} type="button" onClick={() => setMode(v)}
                className={cn('h-9 text-sm font-semibold rounded-lg border transition-colors',
                  mode === v
                    ? v === 'add'
                      ? 'bg-green-600 border-green-600 text-white'
                      : 'bg-red-600 border-red-600 text-white'
                    : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400')}>
                {v === 'add' ? <Plus size={14} className="inline ml-1" /> : <Minus size={14} className="inline ml-1" />}
                {l}
              </button>
            ))}
          </div>
          {/* Qty input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">الكمية</label>
            <input type="number" min="1" value={qty} onChange={e => setQty(e.target.value)}
              placeholder="أدخل الكمية" autoFocus
              className="h-10 border border-gray-200 dark:border-gray-700 rounded-lg px-3 text-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all" />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={onClose}
              className="h-9 px-4 text-sm font-medium rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              إلغاء
            </button>
            <button type="submit" disabled={adjustMutation.isPending}
              className={cn('h-9 px-5 text-sm font-semibold rounded-lg text-white transition-colors disabled:opacity-50 flex items-center gap-2',
                mode === 'add' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700')}>
              {adjustMutation.isPending && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              تأكيد
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Product Form Modal ────────────────────────────────────────────────────────

interface FormState {
  category_id: string; name: string; sku: string; barcode: string
  product_type: ProductType; cost_price: string; selling_price: string
  stock_qty: string; reorder_level: string; unit: string
  default_supplier_id: string; is_active: boolean; notes: string
}

const EMPTY_FORM: FormState = {
  category_id: '', name: '', sku: '', barcode: '',
  product_type: 'accessory', cost_price: '', selling_price: '',
  stock_qty: '0', reorder_level: '5', unit: 'قطعة',
  default_supplier_id: '', is_active: true, notes: '',
}

function ProductModal({ product, onClose }: {
  product: ProductWithCategory | null
  onClose: () => void
}) {
  const { profile }              = useAuth()
  const { data: categories = [] } = useProductCategories()
  const { data: suppliers   = [] } = useSuppliers()
  const createMutation            = useCreateProduct()
  const updateMutation            = useUpdateProduct()
  const createCatMutation         = useCreateCategory()

  const [form, setForm] = useState<FormState>(
    product
      ? {
          category_id:        product.category_id,
          name:               product.name,
          sku:                product.sku        ?? '',
          barcode:            product.barcode    ?? '',
          product_type:       product.product_type,
          cost_price:         String(product.cost_price),
          selling_price:      String(product.selling_price),
          stock_qty:          String(product.stock_qty),
          reorder_level:      String(product.reorder_level),
          unit:               product.unit,
          default_supplier_id: product.default_supplier_id ?? '',
          is_active:          product.is_active,
          notes:              product.notes ?? '',
        }
      : EMPTY_FORM
  )

  const [newCatName, setNewCatName] = useState('')
  const [newCatType, setNewCatType] = useState<ProductType>('accessory')
  const [showNewCat, setShowNewCat] = useState(false)
  const [error, setError]           = useState('')

  const set = (k: keyof FormState, v: string | boolean) =>
    setForm(f => ({ ...f, [k]: v }))

  async function handleAddCategory() {
    if (!newCatName.trim()) return
    try {
      const cat = await createCatMutation.mutateAsync({ name: newCatName.trim(), type: newCatType })
      setForm(f => ({ ...f, category_id: cat.id }))
      setNewCatName('')
      setShowNewCat(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطأ في إضافة التصنيف')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      const payload = {
        ...form,
        cost_price:     Number(form.cost_price)     || 0,
        selling_price:  Number(form.selling_price)  || 0,
        stock_qty:      Number(form.stock_qty)       || 0,
        reorder_level:  Number(form.reorder_level)   || 5,
        created_by:     profile?.id ?? '',
      }
      if (product) {
        await updateMutation.mutateAsync({ id: product.id, form: payload })
      } else {
        await createMutation.mutateAsync(payload)
      }
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'حدث خطأ')
    }
  }

  const loading  = createMutation.isPending || updateMutation.isPending
  const labelCls = 'text-sm font-semibold text-gray-700 dark:text-gray-300'
  const inputCls = 'h-10 border border-gray-200 dark:border-gray-700 rounded-lg px-3 text-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all w-full'

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-2xl shadow-2xl my-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white">
              {product ? 'تعديل منتج' : 'إضافة منتج جديد'}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {product ? product.name : 'إكسسوار أو قطعة غيار'}
            </p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={e => void handleSubmit(e)}>
          <div className="px-6 py-5 flex flex-col gap-5 max-h-[70vh] overflow-y-auto">

            {/* Identity */}
            <div>
              <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">هوية المنتج</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                {/* Category */}
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label className={labelCls}>التصنيف <span className="text-red-500">*</span></label>
                  {showNewCat ? (
                    <div className="flex gap-2 flex-wrap">
                      <input value={newCatName} onChange={e => setNewCatName(e.target.value)}
                        placeholder="اسم التصنيف" autoFocus
                        className="flex-1 h-10 border border-gray-200 dark:border-gray-700 rounded-lg px-3 text-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all" />
                      <select value={newCatType} onChange={e => setNewCatType(e.target.value as ProductType)}
                        className="h-10 border border-gray-200 dark:border-gray-700 rounded-lg px-3 text-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 transition-all cursor-pointer">
                        <option value="accessory">إكسسوار</option>
                        <option value="spare_part">قطعة غيار</option>
                      </select>
                      <button type="button" onClick={() => void handleAddCategory()}
                        disabled={createCatMutation.isPending}
                        className="h-10 px-3 text-sm font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50 whitespace-nowrap">
                        حفظ
                      </button>
                      <button type="button" onClick={() => { setShowNewCat(false); setNewCatName('') }}
                        className="h-10 w-10 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors flex-shrink-0">
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <select value={form.category_id} onChange={e => set('category_id', e.target.value)}
                        required className={inputCls + ' cursor-pointer'}>
                        <option value="">اختر التصنيف</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                      <button type="button" onClick={() => setShowNewCat(true)}
                        className="h-10 w-10 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-200 dark:hover:border-blue-800 transition-colors flex-shrink-0"
                        title="إضافة تصنيف جديد">
                        <Plus size={14} />
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label className={labelCls}>اسم المنتج <span className="text-red-500">*</span></label>
                  <input value={form.name} onChange={e => set('name', e.target.value)}
                    placeholder="مثال: كفر سيليكون iPhone 15" required className={inputCls} />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className={labelCls}>النوع</label>
                  <select value={form.product_type} onChange={e => set('product_type', e.target.value)}
                    className={inputCls + ' cursor-pointer'}>
                    <option value="accessory">إكسسوار</option>
                    <option value="spare_part">قطعة غيار</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className={labelCls}>الوحدة</label>
                  <input value={form.unit} onChange={e => set('unit', e.target.value)}
                    placeholder="قطعة" className={inputCls} />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className={labelCls}>كود SKU</label>
                  <input value={form.sku} onChange={e => set('sku', e.target.value)}
                    placeholder="مثال: ACC-001" dir="ltr" className={inputCls} />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className={labelCls}>الباركود</label>
                  <input value={form.barcode} onChange={e => set('barcode', e.target.value)}
                    placeholder="6XXXXXXXXXXX" dir="ltr" className={inputCls} />
                </div>
              </div>
            </div>

            {/* Pricing */}
            <div>
              <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">الأسعار والمخزون</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className={labelCls}>سعر الشراء (ج.م) <span className="text-red-500">*</span></label>
                  <input type="number" min="0" step="0.01" value={form.cost_price}
                    onChange={e => set('cost_price', e.target.value)} placeholder="0.00" required className={inputCls} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className={labelCls}>سعر البيع (ج.م) <span className="text-red-500">*</span></label>
                  <input type="number" min="0" step="0.01" value={form.selling_price}
                    onChange={e => set('selling_price', e.target.value)} placeholder="0.00" required className={inputCls} />
                </div>
                {!product && (
                  <div className="flex flex-col gap-1.5">
                    <label className={labelCls}>الكمية الابتدائية</label>
                    <input type="number" min="0" value={form.stock_qty}
                      onChange={e => set('stock_qty', e.target.value)} placeholder="0" className={inputCls} />
                  </div>
                )}
                <div className="flex flex-col gap-1.5">
                  <label className={labelCls}>حد التنبيه (إعادة الطلب)</label>
                  <input type="number" min="0" value={form.reorder_level}
                    onChange={e => set('reorder_level', e.target.value)} placeholder="5" className={inputCls} />
                </div>
              </div>
            </div>

            {/* Extra */}
            <div>
              <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">بيانات إضافية</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label className={labelCls}>المورد الافتراضي</label>
                  <select value={form.default_supplier_id} onChange={e => set('default_supplier_id', e.target.value)}
                    className={inputCls + ' cursor-pointer'}>
                    <option value="">بدون مورد افتراضي</option>
                    {suppliers.filter(s => s.is_active).map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label className={labelCls}>ملاحظات</label>
                  <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
                    placeholder="أي ملاحظات إضافية..." rows={2}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all resize-none w-full" />
                </div>
                {product && (
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={form.is_active}
                      onChange={e => set('is_active', e.target.checked)}
                      className="w-4 h-4 accent-blue-600 cursor-pointer" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">منتج نشط</span>
                  </label>
                )}
              </div>
            </div>

            {/* Margin preview */}
            {form.cost_price && form.selling_price && (
              <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-xl p-3 flex items-center justify-between">
                <span className="text-xs text-blue-700 dark:text-blue-400">هامش الربح</span>
                <span className="text-sm font-bold text-blue-700 dark:text-blue-400">
                  {(Number(form.selling_price) - Number(form.cost_price)).toLocaleString('ar-EG')} ج.م
                  {' '}
                  ({Number(form.cost_price) > 0
                    ? `${(((Number(form.selling_price) - Number(form.cost_price)) / Number(form.cost_price)) * 100).toFixed(1)}%`
                    : '—'
                  })
                </span>
              </div>
            )}

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-2.5 text-sm text-red-700 dark:text-red-400">
                {error}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex gap-3 justify-end px-6 py-4 border-t border-gray-100 dark:border-gray-800">
            <button type="button" onClick={onClose}
              className="h-9 px-4 text-sm font-medium rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              إلغاء
            </button>
            <button type="submit" disabled={loading}
              className="h-9 px-5 text-sm font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50 flex items-center gap-2">
              {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {product ? 'حفظ التعديلات' : 'إضافة المنتج'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function ProductsPage() {
  const { data: products  = [], isLoading } = useProducts()
  const { data: stats }                     = useProductStats()
  const deleteMutation                      = useDeleteProduct()

  const [search,    setSearch]    = useState('')
  const [filter,    setFilter]    = useState<FilterType>('all')
  const [page,      setPage]      = useState(1)
  const [modal,     setModal]     = useState<'add' | 'edit' | null>(null)
  const [selected,  setSelected]  = useState<ProductWithCategory | null>(null)
  const [stockProd, setStockProd] = useState<ProductWithCategory | null>(null)

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
      value: `${(stats?.totalCostValue ?? 0).toLocaleString('ar-EG')} ج`,
      sub: `بيع: ${(stats?.totalSellingValue ?? 0).toLocaleString('ar-EG')} ج`,
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
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">إكسسوارات وقطع الغيار</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => exportToCsv('products', PRODUCT_EXPORT_HEADERS, filtered)} className="h-9 px-4 text-sm font-medium rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-2">
            <Download size={14} /> تصدير
          </button>
          <button onClick={() => setModal('add')}
            className="h-9 px-4 text-sm font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors flex items-center gap-2">
            <Plus size={14} /> منتج جديد
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
                    <p>لا توجد منتجات</p>
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
                      {p.cost_price.toLocaleString('ar-EG')} ج
                    </td>
                    <td className="px-4 py-3 text-center text-sm font-semibold text-green-600 dark:text-green-400 whitespace-nowrap">
                      {p.selling_price.toLocaleString('ar-EG')} ج
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => setStockProd(p)}
                        className={cn(
                          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer hover:shadow-sm',
                          isLow
                            ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/30'
                            : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-200 dark:hover:border-blue-800',
                        )}>
                        {isLow && <AlertTriangle size={11} />}
                        {p.stock_qty} {p.unit}
                      </button>
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
                        <button title="تعديل المخزون" onClick={() => setStockProd(p)}
                          className="w-7 h-7 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-600 dark:hover:text-green-400 hover:border-green-200 dark:hover:border-green-800 transition-colors">
                          <BarChart2 size={13} />
                        </button>
                        <button title="تعديل" onClick={() => openEdit(p)}
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
      {modal && <ProductModal product={modal === 'edit' ? selected : null} onClose={closeModal} />}
      {stockProd && <StockModal product={stockProd} onClose={() => setStockProd(null)} />}
    </div>
  )
}
