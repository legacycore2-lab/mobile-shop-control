// src/pages/purchases/components/DeviceInlineForm.tsx
// Inline form to add a new device within a purchase invoice
// @ts-nocheck
// src/pages/purchases/CreatePurchaseModal.tsx
import { useState, useCallback, useRef } from 'react'
import {
  Plus, X, Smartphone, Tag, AlertCircle, FileText,
  Search, ScanLine, Zap, ChevronDown, ChevronUp,
} from 'lucide-react'
import { BarcodeScanner, useUsbScanner } from '@/components/shared/BarcodeScanner'
import { LabelPrintModal, type LabelData } from './LabelPrintModal'
import { useCreatePurchase } from '@/hooks/usePurchases'
import { useSuppliers } from '@/hooks/useSuppliers'
import { useProducts } from '@/hooks/useProducts'
import { useBrands, useModelsByBrand, useCreateDevice, useCreateBrand, useCreateModel } from '@/hooks/useDevices'
import { useProductCategories, useCreateProduct, useCreateCategory } from '@/hooks/useProducts'
import type { DeviceFormData } from '@/services/devices.service'
import type { ProductFormData } from '@/services/products.service'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/cn'
import { fmt } from './constants'
import type { InvoiceDeviceLine, InvoiceProductLine } from '@/repositories/purchases.repository'

// ── New Device Form (inline inside modal) ─────────────────────────────────────

interface NewDeviceForm {
  brand_id:       string
  model_id:       string
  imei1:          string
  imei2:          string
  storage:        string
  color:          string
  condition:      string
  cost_price:     string
  selling_price:  string
  warranty_months: string
  notes:          string
}

const BLANK_DEVICE: NewDeviceForm = {
  brand_id: '', model_id: '', imei1: '', imei2: '',
  storage: '', color: '', condition: 'new',
  cost_price: '', selling_price: '', warranty_months: '12', notes: '',
}

const CONDITIONS = [
  { value: 'new',         label: 'جديد'    },
  { value: 'used',        label: 'مستعمل'  },
  { value: 'refurbished', label: 'مجدد'    },
]

const STORAGES = ['16GB','32GB','64GB','128GB','256GB','512GB','1TB']

export function AddDeviceInlineForm({
  supplierId,
  onAdded,
  onCancel,
  userId,
}: {
  supplierId: string
  onAdded: (line: InvoiceDeviceLine & { label: string }) => void
  onCancel: () => void
  userId: string
}) {
  const { data: brands = [] } = useBrands()
  const [form, setForm]       = useState<NewDeviceForm>(BLANK_DEVICE)
  const [error, setError]     = useState('')
  const [saving, setSaving]   = useState(false)
  const createDevice          = useCreateDevice()
  const createBrand           = useCreateBrand()
  const createModel           = useCreateModel()

  const { data: models = [] } = useModelsByBrand(form.brand_id)

  const [newBrandName, setNewBrandName] = useState('')
  const [showNewBrand, setShowNewBrand] = useState(false)
  const [newModelName, setNewModelName] = useState('')
  const [showNewModel, setShowNewModel] = useState(false)

  async function handleAddBrand() {
    if (!newBrandName.trim()) return
    try {
      const brand = await createBrand.mutateAsync(newBrandName.trim())
      set('brand_id', brand.id)
      set('model_id', '')
      setNewBrandName('')
      setShowNewBrand(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطأ في إضافة الماركة')
    }
  }

  async function handleAddModel() {
    if (!newModelName.trim() || !form.brand_id) return
    try {
      const model = await createModel.mutateAsync({ brandId: form.brand_id, name: newModelName.trim() })
      set('model_id', model.id)
      setNewModelName('')
      setShowNewModel(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطأ في إضافة الموديل')
    }
  }

  function set(field: keyof NewDeviceForm, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleAdd() {
    setError('')
    if (!form.brand_id)      return setError('اختر الماركة')
    if (!form.model_id)      return setError('اختر الموديل')
    if (!form.imei1.trim())  return setError('IMEI مطلوب')
    if (!form.cost_price)    return setError('سعر الشراء مطلوب')
    if (!supplierId)         return setError('اختر المورد أولاً')

    setSaving(true)
    try {
      const deviceForm: DeviceFormData = {
        imei1:           form.imei1.trim(),
        imei2:           form.imei2.trim(),
        serial_number:   '',
        brand_id:        form.brand_id,
        model_id:        form.model_id,
        storage:         form.storage,
        color:           form.color.trim(),
        condition:       form.condition,
        supplier_id:     supplierId,
        purchase_date:   new Date().toISOString().split('T')[0],
        cost_price:      Number(form.cost_price),
        selling_price:   form.selling_price ? Number(form.selling_price) : 0,
        warranty_months: Number(form.warranty_months) || 12,
        location:        '',
        notes:           form.notes.trim(),
        added_by:        userId,
      }
      const device = await createDevice.mutateAsync(deviceForm)

      const brand = brands.find(b => b.id === form.brand_id)
      const model = models.find(m => m.id === form.model_id)
      const label = `${brand?.name ?? ''} ${model?.name ?? ''} — ${form.imei1}`

      onAdded({ device_id: device.id, cost_price: Number(form.cost_price), label })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ')
    } finally {
      setSaving(false)
    }
  }

  const inp = 'h-9 border border-gray-200 dark:border-gray-700 rounded-lg px-3 text-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all w-full'

  return (
    <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-xl p-4 space-y-3">
      <p className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-widest">إضافة جهاز جديد</p>

      {/* Brand */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">الماركة *</label>
          <button type="button" onClick={() => { setShowNewBrand(v => !v); setShowNewModel(false) }}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5">
            <Plus size={11} /> ماركة جديدة
          </button>
        </div>
        {showNewBrand ? (
          <div className="flex gap-2">
            <input value={newBrandName} onChange={e => setNewBrandName(e.target.value)}
              placeholder="اسم الماركة..." className={inp}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void handleAddBrand() } }} />
            <button type="button" onClick={() => void handleAddBrand()} disabled={createBrand.isPending}
              className="h-9 px-3 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50 whitespace-nowrap flex-shrink-0">
              {createBrand.isPending ? '...' : 'إضافة'}
            </button>
            <button type="button" onClick={() => setShowNewBrand(false)}
              className="h-9 w-9 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-400 hover:text-gray-600 flex-shrink-0">
              <X size={13} />
            </button>
          </div>
        ) : (
          <select value={form.brand_id} onChange={e => { set('brand_id', e.target.value); set('model_id', '') }} className={inp + ' cursor-pointer'}>
            <option value="">اختر الماركة</option>
            {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        )}
      </div>

      {/* Model */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">الموديل *</label>
          {form.brand_id && (
            <button type="button" onClick={() => { setShowNewModel(v => !v); setShowNewBrand(false) }}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5">
              <Plus size={11} /> موديل جديد
            </button>
          )}
        </div>
        {showNewModel ? (
          <div className="flex gap-2">
            <input value={newModelName} onChange={e => setNewModelName(e.target.value)}
              placeholder="اسم الموديل..." className={inp}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void handleAddModel() } }} />
            <button type="button" onClick={() => void handleAddModel()} disabled={createModel.isPending}
              className="h-9 px-3 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50 whitespace-nowrap flex-shrink-0">
              {createModel.isPending ? '...' : 'إضافة'}
            </button>
            <button type="button" onClick={() => setShowNewModel(false)}
              className="h-9 w-9 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-400 hover:text-gray-600 flex-shrink-0">
              <X size={13} />
            </button>
          </div>
        ) : (
          <select value={form.model_id} onChange={e => set('model_id', e.target.value)} disabled={!form.brand_id} className={inp + ' cursor-pointer disabled:opacity-50'}>
            <option value="">اختر الموديل</option>
            {models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        )}
      </div>

      {/* IMEI 1 + IMEI 2 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">IMEI 1 *</label>
          <input value={form.imei1} onChange={e => set('imei1', e.target.value)}
            placeholder="355XXXXXXXXXXXX" className={inp} maxLength={20} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">IMEI 2</label>
          <input value={form.imei2} onChange={e => set('imei2', e.target.value)}
            placeholder="اختياري" className={inp} maxLength={20} />
        </div>
      </div>

      {/* Storage + Color + Condition */}
      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">التخزين</label>
          <select value={form.storage} onChange={e => set('storage', e.target.value)} className={inp + ' cursor-pointer'}>
            <option value="">—</option>
            {STORAGES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">اللون</label>
          <input value={form.color} onChange={e => set('color', e.target.value)} placeholder="أسود..." className={inp} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">الحالة</label>
          <select value={form.condition} onChange={e => set('condition', e.target.value)} className={inp + ' cursor-pointer'}>
            {CONDITIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
      </div>

      {/* Cost + Selling + Warranty */}
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
          <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">الضمان (شهر)</label>
          <input type="number" min="0" value={form.warranty_months}
            onChange={e => set('warranty_months', e.target.value)} className={inp} />
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
          className="h-8 px-4 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50 flex items-center gap-1.5">
          {saving && <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
          <Plus size={12} /> إضافة الجهاز
        </button>
      </div>
    </div>
  )
}

// ── Add Product Inline Form ───────────────────────────────────────────────────

interface NewProductForm {
  category_id:   string
  name:          string
  sku:           string
  barcode:       string
  cost_price:    string
  selling_price: string
  stock_qty:     string
  reorder_level: string
  unit:          string
  notes:         string
}
