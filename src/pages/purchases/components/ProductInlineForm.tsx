// src/pages/purchases/components/ProductInlineForm.tsx
// Inline form to add a new product within a purchase invoice
// @ts-nocheck
import { useState } from 'react'
import { X, Plus, AlertCircle } from 'lucide-react'
import { useProductCategories, useCreateProduct, useCreateCategory } from '@/hooks/useProducts'
import type { ProductFormData } from '@/services/products.service'
import { useAuth } from '@/lib/auth'
import type { InvoiceProductLine } from '@/repositories/purchases.repository'

const BLANK_PRODUCT: NewProductForm = {
  category_id: '', name: '', sku: '', barcode: '',
  cost_price: '', selling_price: '',
  stock_qty: '0', reorder_level: '5', unit: 'قطعة', notes: '',
}

const UNITS = ['قطعة', 'زوج', 'كرتون', 'متر', 'لتر']

export function AddProductInlineForm({
  supplierId,
  onAdded,
  onCancel,
  userId,
}: {
  supplierId: string
  onAdded: (line: InvoiceProductLine & { label: string }) => void
  onCancel: () => void
  userId: string
}) {
  const { data: categories = [] } = useProductCategories()
  const createProduct             = useCreateProduct()
  const createCategory            = useCreateCategory()
  const [form, setForm]           = useState<NewProductForm>(BLANK_PRODUCT)
  const [error, setError]         = useState('')
  const [saving, setSaving]       = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [showNewCat, setShowNewCat] = useState(false)

  async function handleAddCategory() {
    if (!newCatName.trim()) return
    try {
      const cat = await createCategory.mutateAsync({ name: newCatName.trim(), type: 'accessory' })
      set('category_id', cat.id)
      setNewCatName('')
      setShowNewCat(false)
    } catch (err) { setError(err instanceof Error ? err.message : 'خطأ في إضافة التصنيف') }
  }

  function set(field: keyof NewProductForm, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleAdd() {
    setError('')
    if (!form.name.trim())    return setError('اسم المنتج مطلوب')
    if (!form.category_id)    return setError('اختر التصنيف')
    if (!form.cost_price)     return setError('سعر الشراء مطلوب')

    setSaving(true)
    try {
      const productForm: ProductFormData = {
        category_id:         form.category_id,
        name:                form.name.trim(),
        sku:                 form.sku.trim(),
        barcode:             form.barcode.trim(),
        product_type:        'accessory',
        cost_price:          Number(form.cost_price),
        selling_price:       form.selling_price ? Number(form.selling_price) : 0,
        stock_qty:           Number(form.stock_qty) || 0,
        reorder_level:       Number(form.reorder_level) || 5,
        unit:                form.unit || 'قطعة',
        default_supplier_id: supplierId,
        is_active:           true,
        notes:               form.notes.trim(),
        created_by:          userId,
      }
      const product = await createProduct.mutateAsync(productForm)
      const qty     = Number(form.stock_qty) || 1

      onAdded({
        product_id: product.id,
        quantity:   qty,
        unit_price: Number(form.cost_price),
        label:      form.name.trim(),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ')
    } finally {
      setSaving(false)
    }
  }

  const inp = 'h-9 border border-gray-200 dark:border-gray-700 rounded-lg px-3 text-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/10 transition-all w-full'

  return (
    <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-xl p-4 space-y-3">
      <p className="text-xs font-bold text-green-700 dark:text-green-400 uppercase tracking-widest">إضافة منتج جديد</p>

      {/* Name + Category */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">اسم المنتج *</label>
          <input value={form.name} onChange={e => set('name', e.target.value)}
            placeholder="كفر سيليكون..." className={inp} />
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">التصنيف *</label>
            <button type="button" onClick={() => setShowNewCat(v => !v)}
              className="text-xs text-green-600 dark:text-green-400 hover:underline flex items-center gap-0.5">
              <Plus size={11} /> تصنيف جديد
            </button>
          </div>
          {showNewCat ? (
            <div className="flex gap-1.5">
              <input value={newCatName} onChange={e => setNewCatName(e.target.value)}
                placeholder="اسم التصنيف..." className={inp}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void handleAddCategory() } }} />
              <button type="button" onClick={() => void handleAddCategory()} disabled={createCategory.isPending}
                className="h-9 px-2.5 text-xs font-semibold rounded-lg bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 whitespace-nowrap flex-shrink-0">
                {createCategory.isPending ? '...' : 'إضافة'}
              </button>
              <button type="button" onClick={() => setShowNewCat(false)}
                className="h-9 w-9 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-400 hover:text-gray-600 flex-shrink-0">
                <X size={13} />
              </button>
            </div>
          ) : (
            <select value={form.category_id} onChange={e => set('category_id', e.target.value)} className={inp + ' cursor-pointer'}>
              <option value="">اختر التصنيف</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
        </div>
      </div>

      {/* SKU + Barcode */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">SKU</label>
          <input value={form.sku} onChange={e => set('sku', e.target.value)}
            placeholder="اختياري" className={inp} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">باركود</label>
          <input value={form.barcode} onChange={e => set('barcode', e.target.value)}
            placeholder="اختياري" className={inp} />
        </div>
      </div>

      {/* Cost + Selling + Unit */}
      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">سعر الشراء * (ج)</label>
          <input type="number" min="0" step="0.01" value={form.cost_price}
            onChange={e => set('cost_price', e.target.value)} placeholder="0.00" className={inp} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">سعر البيع (ج)</label>
          <input type="number" min="0" step="0.01" value={form.selling_price}
            onChange={e => set('selling_price', e.target.value)} placeholder="0.00" className={inp} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">الوحدة</label>
          <select value={form.unit} onChange={e => set('unit', e.target.value)} className={inp + ' cursor-pointer'}>
            {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
      </div>

      {/* Qty + Reorder */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">الكمية المشتراة</label>
          <input type="number" min="1" value={form.stock_qty}
            onChange={e => set('stock_qty', e.target.value)} className={inp} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">حد إعادة الطلب</label>
          <input type="number" min="0" value={form.reorder_level}
            onChange={e => set('reorder_level', e.target.value)} className={inp} />
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
          <AlertCircle size={12} /> {error}
        </p>
      )}

      <div className="flex gap-2 justify-end pt-1">
        <button type="button" onClick={onCancel}
          className="h-8 px-3 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
          إلغاء
        </button>
        <button type="button" onClick={() => void handleAdd()} disabled={saving}
          className="h-8 px-4 text-xs font-semibold rounded-lg bg-green-600 hover:bg-green-700 text-white transition-colors disabled:opacity-50 flex items-center gap-1.5">
          {saving && <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
          <Plus size={12} /> إضافة المنتج
        </button>
      </div>
    </div>
  )
}

// ── Main Modal ────────────────────────────────────────────────────────────────

interface AddedDevice extends InvoiceDeviceLine {
  label: string
}
