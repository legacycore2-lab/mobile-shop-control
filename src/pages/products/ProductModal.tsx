// src/pages/products/ProductModal.tsx
import { useState } from 'react'
import { X, Plus } from 'lucide-react'
import {
  useCreateProduct, useUpdateProduct,
  useProductCategories, useCreateCategory,
} from '@/hooks/useProducts'
import { useSuppliers } from '@/hooks/useSuppliers'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/cn'
import type { ProductWithCategory } from '@/repositories/products.repository'
import { TYPE_MAP } from './constants'
import type { ProductType } from '@/types/database'
import { BarcodeLabelModal } from '@/components/shared/BarcodeLabelModal'

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

export function ProductModal({ product, onClose }: {
  product: ProductWithCategory | null
  onClose: () => void
}) {
  const { profile }               = useAuth()
  const { data: categories = [] } = useProductCategories()
  const { data: suppliers   = [] } = useSuppliers()
  const createMutation             = useCreateProduct()
  const updateMutation             = useUpdateProduct()
  const createCatMutation          = useCreateCategory()

  const [form, setForm] = useState<FormState>(
    product
      ? {
          category_id:         product.category_id,
          name:                product.name,
          sku:                 product.sku        ?? '',
          barcode:             product.barcode    ?? '',
          product_type:        product.product_type,
          cost_price:          String(product.cost_price),
          selling_price:       String(product.selling_price),
          stock_qty:           String(product.stock_qty),
          reorder_level:       String(product.reorder_level),
          unit:                product.unit,
          default_supplier_id: product.default_supplier_id ?? '',
          is_active:           product.is_active,
          notes:               product.notes ?? '',
        }
      : EMPTY_FORM
  )

  const [newCatName,    setNewCatName]    = useState('')
  const [newCatType,    setNewCatType]    = useState<ProductType>('accessory')
  const [showNewCat,    setShowNewCat]    = useState(false)
  const [error,         setError]         = useState('')
  // After save — show barcode label
  const [printLabel,    setPrintLabel]    = useState<{
    code: string; name: string; subName: string; price: number
  } | null>(null)

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
        cost_price:    Number(form.cost_price)    || 0,
        selling_price: Number(form.selling_price) || 0,
        stock_qty:     Number(form.stock_qty)     || 0,
        reorder_level: Number(form.reorder_level) || 5,
        created_by:    profile?.id ?? '',
      }
      if (product) {
        await updateMutation.mutateAsync({ id: product.id, form: payload })
        onClose()
      } else {
        const created = await createMutation.mutateAsync(payload)
        // Generate barcode label automatically
        const code = created.barcode || created.sku || created.id.substring(0, 12)
        const cat  = categories.find(c => c.id === created.category_id)
        setPrintLabel({
          code,
          name:    created.name,
          subName: cat?.name ?? TYPE_MAP[created.product_type].label,
          price:   created.selling_price,
        })
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'حدث خطأ')
    }
  }

  const loading  = createMutation.isPending || updateMutation.isPending
  const labelCls = 'text-sm font-semibold text-gray-700 dark:text-gray-300'
  const inputCls = 'h-10 border border-gray-200 dark:border-gray-700 rounded-lg px-3 text-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all w-full'

  // Show print modal after save (new product only)
  if (printLabel) {
    return (
      <BarcodeLabelModal
        label={{
          type:    'product',
          code:    printLabel.code,
          name:    printLabel.name,
          subName: printLabel.subName,
          price:   printLabel.price,
        }}
        onClose={onClose}
      />
    )
  }

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

            {!product && (
              <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-xl p-3 flex items-center gap-2">
                <span className="text-lg">🏷️</span>
                <span className="text-xs text-green-700 dark:text-green-400">
                  بعد الحفظ سيظهر الباركود جاهزاً للطباعة تلقائياً
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
              {product ? 'حفظ التعديلات' : 'إضافة المنتج 🏷️'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
