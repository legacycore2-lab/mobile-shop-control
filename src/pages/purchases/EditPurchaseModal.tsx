// src/pages/purchases/EditPurchaseModal.tsx
import { useState, useCallback, useRef, useEffect } from 'react'
import {
  X, Smartphone, Tag, AlertCircle, FileText,
  Search, ScanLine, Zap, Plus, Save,
} from 'lucide-react'
import { BarcodeScanner, useUsbScanner } from '@/components/shared/BarcodeScanner'
import { usePurchase } from '@/hooks/usePurchases'
import { useSuppliers } from '@/hooks/useSuppliers'
import { useProducts } from '@/hooks/useProducts'
import { useBrands, useModelsByBrand, useCreateDevice, useCreateBrand, useCreateModel } from '@/hooks/useDevices'
import { useProductCategories, useCreateProduct } from '@/hooks/useProducts'
import { supabase } from '@/lib/supabase'
import { useQueryClient } from '@tanstack/react-query'
import type { DeviceFormData } from '@/services/devices.service'
import type { ProductFormData } from '@/services/products.service'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/cn'
import { fmt } from './constants'
import type { InvoiceDeviceLine, InvoiceProductLine } from '@/repositories/purchases.repository'

// ── Types ─────────────────────────────────────────────────────────────────────

interface AddedDevice extends InvoiceDeviceLine {
  label: string
  isExisting?: boolean // already in DB — not newly added
}

interface NewDeviceForm {
  brand_id: string; model_id: string; imei1: string; imei2: string
  storage: string; color: string; condition: string
  cost_price: string; selling_price: string; warranty_months: string; notes: string
}

const BLANK_DEVICE: NewDeviceForm = {
  brand_id: '', model_id: '', imei1: '', imei2: '',
  storage: '', color: '', condition: 'new',
  cost_price: '', selling_price: '', warranty_months: '12', notes: '',
}

const CONDITIONS = [
  { value: 'new', label: 'جديد' },
  { value: 'used', label: 'مستعمل' },
  { value: 'refurbished', label: 'مجدد' },
]
const STORAGES = ['16GB', '32GB', '64GB', '128GB', '256GB', '512GB', '1TB']
const UNITS    = ['قطعة', 'زوج', 'كرتون', 'متر', 'لتر']

// ── Add Device Inline ─────────────────────────────────────────────────────────

function AddDeviceInlineForm({
  supplierId, onAdded, onCancel, userId,
}: {
  supplierId: string
  onAdded: (line: AddedDevice) => void
  onCancel: () => void
  userId: string
}) {
  const { data: brands = [] } = useBrands()
  const [form, setForm]       = useState<NewDeviceForm>(BLANK_DEVICE)
  const [error, setError]     = useState('')
  const [saving, setSaving]   = useState(false)
  const createDevice  = useCreateDevice()
  const createBrand   = useCreateBrand()
  const createModel   = useCreateModel()
  const { data: models = [] } = useModelsByBrand(form.brand_id)

  const [newBrandName, setNewBrandName] = useState('')
  const [showNewBrand, setShowNewBrand] = useState(false)
  const [newModelName, setNewModelName] = useState('')
  const [showNewModel, setShowNewModel] = useState(false)

  function set(field: keyof NewDeviceForm, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleAddBrand() {
    if (!newBrandName.trim()) return
    try {
      const brand = await createBrand.mutateAsync(newBrandName.trim())
      set('brand_id', brand.id); set('model_id', '')
      setNewBrandName(''); setShowNewBrand(false)
    } catch (err) { setError(err instanceof Error ? err.message : 'خطأ') }
  }

  async function handleAddModel() {
    if (!newModelName.trim() || !form.brand_id) return
    try {
      const model = await createModel.mutateAsync({ brandId: form.brand_id, name: newModelName.trim() })
      set('model_id', model.id); setNewModelName(''); setShowNewModel(false)
    } catch (err) { setError(err instanceof Error ? err.message : 'خطأ') }
  }

  async function handleAdd() {
    setError('')
    if (!form.brand_id)     return setError('اختر الماركة')
    if (!form.model_id)     return setError('اختر الموديل')
    if (!form.imei1.trim()) return setError('IMEI مطلوب')
    if (!form.cost_price)   return setError('سعر الشراء مطلوب')
    if (!supplierId)        return setError('اختر المورد أولاً')
    setSaving(true)
    try {
      const deviceForm: DeviceFormData = {
        imei1: form.imei1.trim(), imei2: form.imei2.trim(), serial_number: '',
        brand_id: form.brand_id, model_id: form.model_id,
        storage: form.storage, color: form.color.trim(),
        condition: form.condition, supplier_id: supplierId,
        purchase_date: new Date().toISOString().split('T')[0],
        cost_price: Number(form.cost_price),
        selling_price: form.selling_price ? Number(form.selling_price) : 0,
        warranty_months: Number(form.warranty_months) || 12,
        location: '', notes: form.notes.trim(), added_by: userId,
      }
      const device = await createDevice.mutateAsync(deviceForm)
      const brand  = brands.find(b => b.id === form.brand_id)
      const model  = models.find(m => m.id === form.model_id)
      onAdded({ device_id: device.id, cost_price: Number(form.cost_price), label: `${brand?.name ?? ''} ${model?.name ?? ''} — ${form.imei1}` })
    } catch (err) { setError(err instanceof Error ? err.message : 'حدث خطأ') }
    finally { setSaving(false) }
  }

  const inp = 'h-9 border border-gray-200 dark:border-gray-700 rounded-lg px-3 text-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all w-full'

  return (
    <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-xl p-4 space-y-3">
      <p className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-widest">إضافة جهاز جديد</p>

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
            <input value={newBrandName} onChange={e => setNewBrandName(e.target.value)} placeholder="اسم الماركة..." className={inp}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void handleAddBrand() } }} />
            <button type="button" onClick={() => void handleAddBrand()} disabled={createBrand.isPending}
              className="h-9 px-3 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 whitespace-nowrap flex-shrink-0">
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
            <input value={newModelName} onChange={e => setNewModelName(e.target.value)} placeholder="اسم الموديل..." className={inp}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void handleAddModel() } }} />
            <button type="button" onClick={() => void handleAddModel()} disabled={createModel.isPending}
              className="h-9 px-3 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 whitespace-nowrap flex-shrink-0">
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

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">IMEI 1 *</label>
          <input value={form.imei1} onChange={e => set('imei1', e.target.value)} placeholder="355XXXXXXXXXXXX" className={inp} maxLength={20} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">IMEI 2</label>
          <input value={form.imei2} onChange={e => set('imei2', e.target.value)} placeholder="اختياري" className={inp} maxLength={20} />
        </div>
      </div>

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

      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">سعر الشراء * (ج)</label>
          <input type="number" min="0" step="0.01" value={form.cost_price} onChange={e => set('cost_price', e.target.value)} placeholder="0.00" className={inp} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">سعر البيع (ج)</label>
          <input type="number" min="0" step="0.01" value={form.selling_price} onChange={e => set('selling_price', e.target.value)} placeholder="0.00" className={inp} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">الضمان (شهر)</label>
          <input type="number" min="0" value={form.warranty_months} onChange={e => set('warranty_months', e.target.value)} className={inp} />
        </div>
      </div>

      {error && <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1"><AlertCircle size={12} /> {error}</p>}

      <div className="flex gap-2 justify-end pt-1">
        <button type="button" onClick={onCancel}
          className="h-8 px-3 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 transition-colors">
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

// ── Main Modal ────────────────────────────────────────────────────────────────

export function EditPurchaseModal({
  invoiceId,
  onClose,
}: {
  invoiceId: string
  onClose: () => void
}) {
  const { profile }              = useAuth()
  const { data: detail, isLoading } = usePurchase(invoiceId)
  const { data: suppliers = [] } = useSuppliers()
  const { data: products  = [] } = useProducts()
  const qc = useQueryClient()

  // Form state — seeded from detail once loaded
  const [supplierId,   setSupplierId]   = useState('')
  const [invoiceDate,  setInvoiceDate]  = useState('')
  const [paidAmount,   setPaidAmount]   = useState('')
  const [discount,     setDiscount]     = useState('0')
  const [notes,        setNotes]        = useState('')
  const [deviceLines,  setDeviceLines]  = useState<AddedDevice[]>([])
  const [productLines, setProductLines] = useState<InvoiceProductLine[]>([])
  const [error,        setError]        = useState('')
  const [saving,       setSaving]       = useState(false)
  const [tab,          setTab]          = useState<'devices' | 'products'>('devices')
  const [productSearch, setProductSearch] = useState('')
  const [scanProduct,   setScanProduct]   = useState(false)
  const [showAddDevice, setShowAddDevice] = useState(false)
  const [scanFeedback,  setScanFeedback]  = useState<{ msg: string; ok: boolean } | null>(null)
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const seeded = useRef(false)

  // Seed form once detail loads
  useEffect(() => {
    if (detail && !seeded.current) {
      seeded.current = true
      const inv = detail.invoice
      setSupplierId(inv.supplier_id ?? '')
      setInvoiceDate(inv.invoice_date)
      setPaidAmount(String(inv.paid_amount))
      setDiscount(String(inv.discount))
      setNotes(inv.notes ?? '')
      setDeviceLines(detail.devices.map(d => ({
        device_id:  d.device_id,
        cost_price: d.cost_price,
        label:      `${d.brand_name} ${d.model_name} — ${d.imei1}`,
        isExisting: true,
      })))
      setProductLines(detail.products.map(p => ({
        product_id: p.product_id,
        quantity:   p.quantity,
        unit_price: p.unit_price,
      })))
    }
  }, [detail])

  function showFeedback(msg: string, ok: boolean) {
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current)
    setScanFeedback({ msg, ok })
    feedbackTimer.current = setTimeout(() => setScanFeedback(null), 2500)
  }

  // Devices
  function handleDeviceAdded(line: AddedDevice) {
    setDeviceLines(prev => [...prev, line])
    setShowAddDevice(false)
    showFeedback(`✓ ${line.label} — تمت الإضافة`, true)
  }

  function updateDeviceCost(deviceId: string, cost: number) {
    setDeviceLines(prev => prev.map(l => l.device_id === deviceId ? { ...l, cost_price: cost } : l))
  }

  function removeDevice(deviceId: string) {
    setDeviceLines(prev => prev.filter(l => l.device_id !== deviceId))
  }

  // Products
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

  // Scan
  const handleProductScan = useCallback((code: string) => {
    setScanProduct(false)
    const match = products.find(p => p.is_active && (p.barcode === code || p.sku === code))
    if (match) { addProduct(match.id); showFeedback(`✓ ${match.name} — تمت الإضافة`, true) }
    else { setProductSearch(code); showFeedback(`لم يُعثر على باركود: ${code}`, false) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products])

  const handleUsbScan = useCallback((code: string) => {
    if (tab === 'products') handleProductScan(code)
  }, [tab, handleProductScan])

  useUsbScanner(handleUsbScan, !scanProduct)

  // Totals
  const deviceTotal  = deviceLines .reduce((s, l) => s + l.cost_price,             0)
  const productTotal = productLines.reduce((s, l) => s + l.unit_price * l.quantity, 0)
  const grandTotal   = deviceTotal + productTotal
  const afterDisc    = Math.max(0, grandTotal - (Number(discount) || 0))
  const remaining    = Math.max(0, afterDisc - (Number(paidAmount) || 0))

  // ── Save ──────────────────────────────────────────────────────────────────

  async function handleSave() {
    setError('')
    if (!supplierId)  return setError('المورد مطلوب')
    if (!invoiceDate) return setError('تاريخ الفاتورة مطلوب')
    if (!deviceLines.length && !productLines.length) return setError('يجب إضافة بند واحد على الأقل')

    setSaving(true)
    try {
      const oldDetail = detail!
      const oldDeviceIds  = oldDetail.devices.map(d => d.device_id)
      const newDeviceIds  = deviceLines.map(l => l.device_id)

      // 1. Rollback removed devices → in_stock
      const removedDeviceIds = oldDeviceIds.filter(id => !newDeviceIds.includes(id))
      if (removedDeviceIds.length > 0) {
        await supabase.from('mobile_devices')
          .update({ status: 'in_stock', purchase_invoice_id: null } as never)
          .in('id', removedDeviceIds)
      }

      // 2. Rollback removed products → subtract stock
      const oldProductMap = new Map(oldDetail.products.map(p => [p.product_id, p.quantity]))
      const newProductMap = new Map(productLines.map(p => [p.product_id, p.quantity]))

      for (const [productId, oldQty] of oldProductMap) {
        const newQty = newProductMap.get(productId) ?? 0
        if (newQty < oldQty) {
          const { data: prod } = await supabase.from('products').select('stock_qty').eq('id', productId).single()
          const currentStock = (prod as { stock_qty: number } | null)?.stock_qty ?? 0
          await supabase.from('products')
            .update({ stock_qty: currentStock - (oldQty - newQty) } as never)
            .eq('id', productId)
        } else if (newQty > oldQty) {
          const { data: prod } = await supabase.from('products').select('stock_qty').eq('id', productId).single()
          const currentStock = (prod as { stock_qty: number } | null)?.stock_qty ?? 0
          await supabase.from('products')
            .update({ stock_qty: currentStock + (newQty - oldQty) } as never)
            .eq('id', productId)
        }
      }

      // 3. Add stock for newly added products
      for (const [productId, newQty] of newProductMap) {
        if (!oldProductMap.has(productId)) {
          const { data: prod } = await supabase.from('products').select('stock_qty').eq('id', productId).single()
          const currentStock = (prod as { stock_qty: number } | null)?.stock_qty ?? 0
          await supabase.from('products')
            .update({ stock_qty: currentStock + newQty } as never)
            .eq('id', productId)
        }
      }

      // 4. Update device cost prices
      for (const line of deviceLines) {
        await supabase.from('mobile_devices')
          .update({ cost_price: line.cost_price, purchase_invoice_id: invoiceId } as never)
          .eq('id', line.device_id)
      }

      // 5. Link newly added devices to invoice
      const addedDeviceIds = newDeviceIds.filter(id => !oldDeviceIds.includes(id))
      if (addedDeviceIds.length > 0) {
        await supabase.from('purchase_invoice_devices')
          .insert(addedDeviceIds.map(id => ({ invoice_id: invoiceId, device_id: id, cost_price: deviceLines.find(l => l.device_id === id)!.cost_price })) as never)
      }

      // 6. Remove device lines for removed devices
      if (removedDeviceIds.length > 0) {
        await supabase.from('purchase_invoice_devices')
          .delete()
          .eq('invoice_id', invoiceId)
          .in('device_id', removedDeviceIds)
      }

      // 7. Update cost prices in purchase_invoice_devices for existing devices
      for (const line of deviceLines.filter(l => l.isExisting)) {
        await supabase.from('purchase_invoice_devices')
          .update({ cost_price: line.cost_price } as never)
          .eq('invoice_id', invoiceId)
          .eq('device_id', line.device_id)
      }

      // 8. Replace product lines
      await supabase.from('purchase_invoice_products').delete().eq('invoice_id', invoiceId)
      if (productLines.length > 0) {
        await supabase.from('purchase_invoice_products')
          .insert(productLines.map(l => ({ invoice_id: invoiceId, product_id: l.product_id, quantity: l.quantity, unit_price: l.unit_price })) as never)
      }

      // 9. Update invoice header
      const totalAmount = Math.max(0, grandTotal - (Number(discount) || 0))
      await supabase.from('purchase_invoices')
        .update({
          supplier_id:  supplierId,
          invoice_date: invoiceDate,
          total_amount: totalAmount,
          paid_amount:  Number(paidAmount) || 0,
          discount:     Number(discount)   || 0,
          notes:        notes.trim() || null,
        } as never)
        .eq('id', invoiceId)

      // 10. Invalidate queries
      await qc.invalidateQueries({ queryKey: ['purchases'] })
      await qc.invalidateQueries({ queryKey: ['purchases', invoiceId] })
      await qc.invalidateQueries({ queryKey: ['devices'] })
      await qc.invalidateQueries({ queryKey: ['products'] })
      await qc.invalidateQueries({ queryKey: ['ledger', 'suppliers'] })

      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء الحفظ')
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'h-10 border border-gray-200 dark:border-gray-700 rounded-lg px-3 text-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all w-full'
  const labelCls = 'text-sm font-semibold text-gray-700 dark:text-gray-300'

  if (isLoading) return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-8">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-2xl shadow-2xl my-4">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white">
              تعديل فاتورة — {detail?.invoice.invoice_number}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">تعديل كامل للبيانات والبنود</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-1.5">
              <Zap size={11} className="text-amber-600 dark:text-amber-400" />
              <span className="text-xs text-amber-700 dark:text-amber-400 font-medium">وضع التعديل</span>
            </div>
            <button onClick={onClose}
              className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="px-6 py-5 flex flex-col gap-5 max-h-[80vh] overflow-y-auto">

          {/* Scan feedback */}
          {scanFeedback && (
            <div className={cn('rounded-lg px-4 py-2.5 flex items-center gap-2 text-sm font-medium',
              scanFeedback.ok
                ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400'
                : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400')}>
              {scanFeedback.msg}
            </div>
          )}

          {/* Header fields */}
          <div>
            <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">بيانات الفاتورة</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label className={labelCls}>المورد <span className="text-red-500">*</span></label>
                <select value={supplierId} onChange={e => setSupplierId(e.target.value)} className={inputCls + ' cursor-pointer'}>
                  <option value="">اختر المورد</option>
                  {suppliers.filter(s => s.is_active).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className={labelCls}>تاريخ الفاتورة <span className="text-red-500">*</span></label>
                <input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} className={inputCls} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className={labelCls}>المبلغ المدفوع (ج.م)</label>
                <input type="number" min="0" step="0.01" value={paidAmount} onChange={e => setPaidAmount(e.target.value)} placeholder="0.00" className={inputCls} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className={labelCls}>الخصم (ج.م)</label>
                <input type="number" min="0" step="0.01" value={discount} onChange={e => setDiscount(e.target.value)} placeholder="0.00" className={inputCls} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className={labelCls}>ملاحظات</label>
                <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="أي ملاحظات..." className={inputCls} />
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

            {/* Devices tab */}
            {tab === 'devices' && (
              <div className="space-y-3">
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
                          {line.isExisting && <p className="text-xs text-blue-500 dark:text-blue-400">موجود</p>}
                        </div>
                        <input type="number" min="0" step="0.01" value={line.cost_price}
                          onChange={e => updateDeviceCost(line.device_id, Number(e.target.value))}
                          className="w-24 h-8 border border-blue-300 dark:border-blue-700 rounded-lg px-2 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 text-center" />
                        <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">ج</span>
                        <button type="button" onClick={() => removeDevice(line.device_id)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex-shrink-0">
                          <X size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {showAddDevice ? (
                  <AddDeviceInlineForm
                    supplierId={supplierId}
                    userId={profile?.id ?? ''}
                    onAdded={handleDeviceAdded}
                    onCancel={() => setShowAddDevice(false)}
                  />
                ) : (
                  <button type="button" onClick={() => setShowAddDevice(true)}
                    className="w-full h-10 flex items-center justify-center gap-2 border-2 border-dashed border-blue-300 dark:border-blue-700 rounded-xl text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                    <Plus size={16} /> إضافة جهاز جديد للفاتورة
                  </button>
                )}
              </div>
            )}

            {/* Products tab */}
            {tab === 'products' && (
              <div className="space-y-3 min-h-[200px]">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input value={productSearch} onChange={e => setProductSearch(e.target.value)}
                      placeholder="بحث بالاسم أو الباركود..."
                      className="w-full h-9 pr-9 pl-3 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all" />
                  </div>
                  <button type="button" onClick={() => setScanProduct(true)}
                    className="h-9 w-9 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition-colors flex-shrink-0">
                    <ScanLine size={15} />
                  </button>
                </div>

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
                          <p className="text-xs text-gray-400 dark:text-gray-600">{p.category_name}</p>
                        </div>
                        <div className="text-left flex-shrink-0 mr-2">
                          <p className="text-sm font-bold text-blue-600 dark:text-blue-400">{fmt(p.cost_price)} ج</p>
                          <Plus size={14} className="mx-auto text-gray-300 group-hover:text-blue-500 mt-0.5" />
                        </div>
                      </button>
                    ))}
                </div>

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
              </div>
            )}
          </div>

          {/* Totals */}
          {(deviceLines.length > 0 || productLines.length > 0) && (
            <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl p-4 space-y-2">
              <p className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest">ملخص الفاتورة</p>
              {[
                ['أجهزة',     `${deviceLines.length} جهاز — ${fmt(deviceTotal)} ج`],
                ['منتجات',    `${fmt(productTotal)} ج`],
                ['الإجمالي',  `${fmt(grandTotal)} ج`],
                ['بعد الخصم', `${fmt(afterDisc)} ج`],
                ['المتبقي',   `${fmt(remaining)} ج`],
              ].map(([l, v]) => (
                <div key={l} className="flex items-center justify-between">
                  <span className="text-xs text-amber-700 dark:text-amber-400">{l}</span>
                  <span className={cn('text-sm font-bold',
                    l === 'المتبقي' && remaining > 0
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-amber-900 dark:text-amber-100')}>{v}</span>
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
          <button type="button" onClick={() => void handleSave()} disabled={saving}
            className="h-9 px-5 text-sm font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white transition-colors disabled:opacity-50 flex items-center gap-2">
            {saving && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            <Save size={14} /> حفظ التعديلات
          </button>
        </div>

        {scanProduct && (
          <BarcodeScanner title="مسح باركود المنتج" placeholder="باركود أو SKU..."
            onScan={handleProductScan} onClose={() => setScanProduct(false)} />
        )}
      </div>
    </div>
  )
}
