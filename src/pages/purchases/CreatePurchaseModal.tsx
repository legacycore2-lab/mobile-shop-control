// src/pages/purchases/CreatePurchaseModal.tsx
import { useState, useCallback, useRef } from 'react'
import {
  Plus, X, Smartphone, Tag, AlertCircle, FileText,
  Search, ScanLine, Zap, ChevronDown, ChevronUp,
} from 'lucide-react'
import { BarcodeScanner, useUsbScanner } from '@/components/shared/BarcodeScanner'
import { useCreatePurchase } from '@/hooks/usePurchases'
import { useSuppliers } from '@/hooks/useSuppliers'
import { useProducts } from '@/hooks/useProducts'
import { useBrands, useModelsByBrand, useCreateDevice } from '@/hooks/useDevices'
import { useProductCategories, useCreateProduct } from '@/hooks/useProducts'
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
  { value: 'new',           label: 'جديد'        },
  { value: 'used_like_new', label: 'مستعمل كالجديد' },
  { value: 'used_good',     label: 'مستعمل جيد'  },
  { value: 'used_fair',     label: 'مستعمل مقبول' },
  { value: 'refurbished',   label: 'مجدد'         },
]

const STORAGES = ['16GB','32GB','64GB','128GB','256GB','512GB','1TB']

function AddDeviceInlineForm({
  supplierId,
  onAdded,
  onCancel,
}: {
  supplierId: string
  onAdded: (line: InvoiceDeviceLine & { label: string }) => void
  onCancel: () => void
}) {
  const { data: brands = [] } = useBrands()
  const [form, setForm]       = useState<NewDeviceForm>(BLANK_DEVICE)
  const [error, setError]     = useState('')
  const [saving, setSaving]   = useState(false)
  const createDevice          = useCreateDevice()

  const { data: models = [] } = useModelsByBrand(form.brand_id)

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
        added_by:        '',
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

      {/* Brand + Model */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">الماركة *</label>
          <select value={form.brand_id} onChange={e => { set('brand_id', e.target.value); set('model_id', '') }} className={inp + ' cursor-pointer'}>
            <option value="">اختر الماركة</option>
            {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">الموديل *</label>
          <select value={form.model_id} onChange={e => set('model_id', e.target.value)} disabled={!form.brand_id} className={inp + ' cursor-pointer disabled:opacity-50'}>
            <option value="">اختر الموديل</option>
            {models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
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

const BLANK_PRODUCT: NewProductForm = {
  category_id: '', name: '', sku: '', barcode: '',
  cost_price: '', selling_price: '',
  stock_qty: '0', reorder_level: '5', unit: 'قطعة', notes: '',
}

const UNITS = ['قطعة', 'زوج', 'كرتون', 'متر', 'لتر']

function AddProductInlineForm({
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
  const [form, setForm]           = useState<NewProductForm>(BLANK_PRODUCT)
  const [error, setError]         = useState('')
  const [saving, setSaving]       = useState(false)

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
          <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">التصنيف *</label>
          <select value={form.category_id} onChange={e => set('category_id', e.target.value)} className={inp + ' cursor-pointer'}>
            <option value="">اختر التصنيف</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
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

export function CreatePurchaseModal({ onClose }: { onClose: () => void }) {
  const { profile }              = useAuth()
  const { data: suppliers = [] } = useSuppliers()
  const { data: products  = [] } = useProducts()
  const createMutation           = useCreatePurchase()

  const [supplierId,    setSupplierId]    = useState('')
  const [invoiceDate,   setInvoiceDate]   = useState(new Date().toISOString().split('T')[0])
  const [paidAmount,    setPaidAmount]    = useState('')
  const [discount,      setDiscount]      = useState('0')
  const [notes,         setNotes]         = useState('')
  const [deviceLines,   setDeviceLines]   = useState<AddedDevice[]>([])
  const [productLines,  setProductLines]  = useState<InvoiceProductLine[]>([])
  const [error,         setError]         = useState('')
  const [tab,           setTab]           = useState<'devices' | 'products'>('devices')
  const [productSearch, setProductSearch] = useState('')
  const [scanProduct,   setScanProduct]   = useState(false)
  const [showAddDevice, setShowAddDevice] = useState(false)
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [scanFeedback,  setScanFeedback]  = useState<{ msg: string; ok: boolean } | null>(null)
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function showFeedback(msg: string, ok: boolean) {
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current)
    setScanFeedback({ msg, ok })
    feedbackTimer.current = setTimeout(() => setScanFeedback(null), 2500)
  }

  // ── Device lines ──────────────────────────────────────────────────────────

  function handleDeviceAdded(line: AddedDevice) {
    setDeviceLines(prev => [...prev, line])
    setShowAddDevice(false)
    showFeedback(`✓ ${line.label} — تمت الإضافة`, true)
  }

  function handleProductAdded(line: InvoiceProductLine & { label: string }) {
    const { label, ...rest } = line
    setProductLines(prev => {
      const exists = prev.find(l => l.product_id === rest.product_id)
      if (exists) return prev.map(l => l.product_id === rest.product_id
        ? { ...l, quantity: l.quantity + rest.quantity } : l)
      return [...prev, rest]
    })
    setShowAddProduct(false)
    showFeedback(`✓ ${label} — تمت الإضافة`, true)
  }

  function updateDeviceCost(deviceId: string, cost: number) {
    setDeviceLines(prev => prev.map(l => l.device_id === deviceId ? { ...l, cost_price: cost } : l))
  }

  function removeDevice(deviceId: string) {
    setDeviceLines(prev => prev.filter(l => l.device_id !== deviceId))
  }

  // ── Product lines ─────────────────────────────────────────────────────────

  function addProduct(productId: string) {
    const product = products.find(p => p.id === productId)
    if (!product) return
    setProductLines(prev => {
      const exists = prev.find(l => l.product_id === productId)
      if (exists) return prev.map(l => l.product_id === productId ? { ...l, quantity: l.quantity + 1 } : l)
      return [...prev, { product_id: productId, quantity: 1, unit_price: product.cost_price }]
    })
  }

  function updateProductLine(productId: string, field: 'quantity' | 'unit_price', value: number) {
    setProductLines(prev => prev.map(l => l.product_id === productId ? { ...l, [field]: value } : l))
  }

  function removeProductLine(productId: string) {
    setProductLines(prev => prev.filter(l => l.product_id !== productId))
  }

  // ── Barcode scan ──────────────────────────────────────────────────────────

  const handleProductScan = useCallback((code: string) => {
    setScanProduct(false)
    const match = products.find(p => p.is_active && (p.barcode === code || p.sku === code))
    if (match) {
      addProduct(match.id)
      showFeedback(`✓ ${match.name} — تمت الإضافة`, true)
    } else {
      setProductSearch(code)
      showFeedback(`لم يُعثر على باركود: ${code}`, false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products])

  const handleUsbScan = useCallback((code: string) => {
    if (tab === 'products') handleProductScan(code)
  }, [tab, handleProductScan])

  useUsbScanner(handleUsbScan, !scanProduct)

  // ── Totals ────────────────────────────────────────────────────────────────

  const deviceTotal  = deviceLines .reduce((s, l) => s + l.cost_price,             0)
  const productTotal = productLines.reduce((s, l) => s + l.unit_price * l.quantity, 0)
  const grandTotal   = deviceTotal + productTotal
  const afterDisc    = Math.max(0, grandTotal - (Number(discount) || 0))
  const remaining    = Math.max(0, afterDisc - (Number(paidAmount) || 0))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      await createMutation.mutateAsync({
        supplier_id:   supplierId,
        invoice_date:  invoiceDate,
        paid_amount:   Number(paidAmount)  || 0,
        discount:      Number(discount)    || 0,
        notes,
        created_by:    profile?.id         ?? '',
        device_lines:  deviceLines.map(({ device_id, cost_price }) => ({ device_id, cost_price })),
        product_lines: productLines,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ')
    }
  }

  const inputCls = 'h-10 border border-gray-200 dark:border-gray-700 rounded-lg px-3 text-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all w-full'
  const labelCls = 'text-sm font-semibold text-gray-700 dark:text-gray-300'

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-2xl shadow-2xl my-4">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white">فاتورة شراء جديدة</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">أجهزة ومنتجات من الموردين</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-3 py-1.5">
              <Zap size={11} className="text-blue-600 dark:text-blue-400" />
              <span className="text-xs text-blue-700 dark:text-blue-400 font-medium">USB جاهز</span>
            </div>
            <button onClick={onClose}
              className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>

        <form onSubmit={e => void handleSubmit(e)}>
          <div className="px-6 py-5 flex flex-col gap-5 max-h-[75vh] overflow-y-auto">

            {/* Scan feedback */}
            {scanFeedback && (
              <div className={cn(
                'rounded-lg px-4 py-2.5 flex items-center gap-2 text-sm font-medium',
                scanFeedback.ok
                  ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400'
                  : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'
              )}>
                {scanFeedback.msg}
              </div>
            )}

            {/* Header fields */}
            <div>
              <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">بيانات الفاتورة</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label className={labelCls}>المورد <span className="text-red-500">*</span></label>
                  <select value={supplierId} onChange={e => setSupplierId(e.target.value)}
                    required className={inputCls + ' cursor-pointer'}>
                    <option value="">اختر المورد</option>
                    {suppliers.filter(s => s.is_active).map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className={labelCls}>تاريخ الفاتورة <span className="text-red-500">*</span></label>
                  <input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)}
                    required className={inputCls} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className={labelCls}>المبلغ المدفوع (ج.م)</label>
                  <input type="number" min="0" step="0.01" value={paidAmount}
                    onChange={e => setPaidAmount(e.target.value)} placeholder="0.00" className={inputCls} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className={labelCls}>الخصم (ج.م)</label>
                  <input type="number" min="0" step="0.01" value={discount}
                    onChange={e => setDiscount(e.target.value)} placeholder="0.00" className={inputCls} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className={labelCls}>ملاحظات</label>
                  <input value={notes} onChange={e => setNotes(e.target.value)}
                    placeholder="أي ملاحظات..." className={inputCls} />
                </div>
              </div>
            </div>

            {/* Items tabs */}
            <div>
              <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">بنود الفاتورة</p>
              <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 mb-4">
                {([['devices', 'أجهزة', Smartphone], ['products', 'منتجات', Tag]] as const).map(([v, l, Icon]) => (
                  <button key={v} type="button" onClick={() => setTab(v)}
                    className={cn('flex-1 flex items-center justify-center gap-2 h-8 text-sm font-medium rounded-md transition-all',
                      tab === v
                        ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300')}>
                    <Icon size={14} /> {l}
                    {v === 'devices'  && deviceLines.length  > 0 && <span className="bg-blue-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">{deviceLines.length}</span>}
                    {v === 'products' && productLines.length > 0 && <span className="bg-blue-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">{productLines.length}</span>}
                  </button>
                ))}
              </div>

              {/* ── Devices tab ── */}
              {tab === 'devices' && (
                <div className="space-y-3">
                  {!supplierId ? (
                    <div className="py-6 text-center text-gray-400 dark:text-gray-600 text-sm">
                      اختر المورد أولاً لإضافة الأجهزة
                    </div>
                  ) : (
                    <>
                      {/* Added devices list */}
                      {deviceLines.length > 0 && (
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {deviceLines.map(line => (
                            <div key={line.device_id}
                              className="flex items-center gap-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-3 py-2">
                              <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0">
                                <Smartphone size={14} className="text-blue-600 dark:text-blue-400" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{line.label}</p>
                              </div>
                              <input
                                type="number" min="0" step="0.01"
                                value={line.cost_price}
                                onChange={e => updateDeviceCost(line.device_id, Number(e.target.value))}
                                className="w-24 h-8 border border-blue-300 dark:border-blue-700 rounded-lg px-2 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 text-center"
                              />
                              <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">ج</span>
                              <button type="button" onClick={() => removeDevice(line.device_id)}
                                className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex-shrink-0">
                                <X size={13} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add device form (inline) */}
                      {showAddDevice ? (
                        <AddDeviceInlineForm
                          supplierId={supplierId}
                          onAdded={handleDeviceAdded}
                          onCancel={() => setShowAddDevice(false)}
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => setShowAddDevice(true)}
                          className="w-full h-10 flex items-center justify-center gap-2 border-2 border-dashed border-blue-300 dark:border-blue-700 rounded-xl text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                        >
                          <Plus size={16} />
                          إضافة جهاز جديد للفاتورة
                          <ChevronDown size={14} />
                        </button>
                      )}

                      {deviceLines.length === 0 && !showAddDevice && (
                        <p className="text-center text-xs text-gray-400 dark:text-gray-600 mt-1">
                          اضغط الزر بالأعلى لإضافة جهاز جديد مباشرةً
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* ── Products tab ── */}
              {tab === 'products' && (
                <div className="space-y-3">

                  {/* Add new product inline */}
                  {showAddProduct ? (
                    <AddProductInlineForm
                      supplierId={supplierId}
                      userId={profile?.id ?? ''}
                      onAdded={handleProductAdded}
                      onCancel={() => setShowAddProduct(false)}
                    />
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => setShowAddProduct(true)}
                        className="w-full h-10 flex items-center justify-center gap-2 border-2 border-dashed border-green-300 dark:border-green-700 rounded-xl text-sm font-medium text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                      >
                        <Plus size={16} />
                        إضافة منتج جديد للكاتالوج والفاتورة
                        <ChevronDown size={14} />
                      </button>

                      {/* Search existing products */}
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input
                            value={productSearch}
                            onChange={e => setProductSearch(e.target.value)}
                            placeholder="بحث بالاسم أو الباركود..."
                            className="w-full h-9 pr-9 pl-3 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
                          />
                        </div>
                        <button type="button" onClick={() => setScanProduct(true)}
                          className="h-9 w-9 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex-shrink-0"
                          title="مسح باركود المنتج بالكاميرا">
                          <ScanLine size={15} />
                        </button>
                      </div>

                      {/* Catalog list */}
                      <div className="max-h-44 overflow-y-auto space-y-1.5 border border-gray-100 dark:border-gray-800 rounded-xl p-2">
                        {products
                          .filter(p => p.is_active && !productLines.find(l => l.product_id === p.id))
                          .filter(p => !productSearch ||
                            p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
                            (p.sku ?? '').toLowerCase().includes(productSearch.toLowerCase()) ||
                            (p.barcode ?? '').includes(productSearch))
                          .map(p => (
                            <button key={p.id} type="button"
                              onClick={() => { addProduct(p.id); setProductSearch('') }}
                              className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors text-right group">
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-blue-700 dark:group-hover:text-blue-300 truncate">{p.name}</p>
                                <p className="text-xs text-gray-400 dark:text-gray-600">{p.category_name}{p.barcode ? ` · ${p.barcode}` : ''}</p>
                              </div>
                              <div className="text-left flex-shrink-0 mr-2">
                                <p className="text-sm font-bold text-blue-600 dark:text-blue-400">{fmt(p.cost_price)} ج</p>
                                <Plus size={14} className="mx-auto text-gray-300 group-hover:text-blue-500 mt-0.5" />
                              </div>
                            </button>
                          ))
                        }
                        {products.filter(p => p.is_active).length === 0 && (
                          <p className="text-sm text-gray-400 dark:text-gray-600 text-center py-3">لا توجد منتجات — اضغط الزر بالأعلى لإضافة جديد</p>
                        )}
                      </div>

                      {/* Selected product lines */}
                      {productLines.length === 0 ? (
                        <div className="py-4 text-center text-gray-400 dark:text-gray-600 text-sm">لم تتم إضافة منتجات بعد</div>
                      ) : (
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {productLines.map(line => {
                            const product = products.find(p => p.id === line.product_id)
                            return (
                              <div key={line.product_id} className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{product?.name}</p>
                                </div>
                                <input type="number" min="1" value={line.quantity}
                                  onChange={e => updateProductLine(line.product_id, 'quantity', Number(e.target.value))}
                                  className="w-16 h-8 border border-gray-200 dark:border-gray-700 rounded-lg px-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-center focus:outline-none focus:border-blue-500" />
                                <span className="text-xs text-gray-400 dark:text-gray-600">×</span>
                                <input type="number" min="0" step="0.01" value={line.unit_price}
                                  onChange={e => updateProductLine(line.product_id, 'unit_price', Number(e.target.value))}
                                  className="w-24 h-8 border border-gray-200 dark:border-gray-700 rounded-lg px-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-center focus:outline-none focus:border-blue-500" />
                                <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap w-20 text-left">
                                  = {fmt(line.quantity * line.unit_price)} ج
                                </span>
                                <button type="button" onClick={() => removeProductLine(line.product_id)}
                                  className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex-shrink-0">
                                  <X size={13} />
                                </button>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

            </div>

            {/* Totals summary */}
            {(deviceLines.length > 0 || productLines.length > 0) && (
              <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-xl p-4 space-y-2">
                <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest">ملخص الفاتورة</p>
                {[
                  ['أجهزة',      `${deviceLines.length} جهاز — ${fmt(deviceTotal)} ج`],
                  ['منتجات',     `${fmt(productTotal)} ج`],
                  ['الإجمالي',   `${fmt(grandTotal)} ج`],
                  ['بعد الخصم', `${fmt(afterDisc)} ج`],
                  ['المتبقي',    `${fmt(remaining)} ج`],
                ].map(([l, v]) => (
                  <div key={l} className="flex items-center justify-between">
                    <span className="text-xs text-blue-700 dark:text-blue-400">{l}</span>
                    <span className={cn('text-sm font-bold',
                      l === 'المتبقي' && remaining > 0
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-blue-900 dark:text-blue-100')}>{v}</span>
                  </div>
                ))}
              </div>
            )}

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-2.5 text-sm text-red-700 dark:text-red-400 flex items-center gap-2">
                <AlertCircle size={14} /> {error}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex gap-3 justify-end px-6 py-4 border-t border-gray-100 dark:border-gray-800">
            <button type="button" onClick={onClose}
              className="h-9 px-4 text-sm font-medium rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              إلغاء
            </button>
            <button type="submit" disabled={createMutation.isPending}
              className="h-9 px-5 text-sm font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50 flex items-center gap-2">
              {createMutation.isPending && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              <FileText size={14} /> حفظ كمسودة
            </button>
          </div>
        </form>

        {scanProduct && (
          <BarcodeScanner
            title="مسح باركود المنتج"
            placeholder="باركود أو SKU..."
            onScan={handleProductScan}
            onClose={() => setScanProduct(false)}
          />
        )}
      </div>
    </div>
  )
}
