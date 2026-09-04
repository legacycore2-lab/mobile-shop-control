// src/pages/dashboard/QuickScanModal.tsx
import { useState, useCallback } from 'react'
import { X, ScanLine, Smartphone, Package, DollarSign, Settings, Tag, AlertCircle, CheckCircle, Edit3 } from 'lucide-react'
import { BarcodeScanner, useUsbScanner } from '@/components/shared/BarcodeScanner'
import { supabase } from '@/lib/supabase'
import { fmt } from '@/constants/statusMaps'
import { cn } from '@/lib/cn'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'

// ── Types ─────────────────────────────────────────────────────────────────────

interface DeviceResult {
  kind: 'device'
  id: string; imei1: string; imei2: string | null
  brand: string; model: string
  storage: string | null; color: string | null; condition: string
  status: string; cost_price: number; selling_price: number
  actual_selling_price: number | null
  warranty_months: number | null
  supplier_name: string | null
  invoice_number: string | null
}

interface ProductResult {
  kind: 'product'
  id: string; name: string; sku: string | null; barcode: string | null
  category: string; unit: string
  stock_qty: number; cost_price: number; selling_price: number
  reorder_level: number | null
}

type ScanResult = DeviceResult | ProductResult | null

// ── Condition labels ──────────────────────────────────────────────────────────
const COND: Record<string, string> = { new: 'جديد', used: 'مستعمل', refurbished: 'مجدد' }
const STATUS: Record<string, { label: string; color: string }> = {
  in_stock:       { label: 'في المخزون',  color: 'text-green-600 dark:text-green-400'  },
  sold:           { label: 'مباع',        color: 'text-blue-600 dark:text-blue-400'    },
  returned:       { label: 'مُعاد',       color: 'text-amber-600 dark:text-amber-400'  },
  defective:      { label: 'تالف',        color: 'text-red-600 dark:text-red-400'      },
  sent_to_repair: { label: 'في الصيانة', color: 'text-purple-600 dark:text-purple-400' },
}

// ── Lookup ────────────────────────────────────────────────────────────────────

async function lookupCode(code: string): Promise<ScanResult> {
  const clean = code.trim()

  // 1. Try IMEI lookup
  const { data: devices } = await supabase
    .from('mobile_devices')
    .select(`
      id, imei1, imei2, storage, color, condition, status,
      cost_price, selling_price, actual_selling_price, warranty_months,
      mobile_models!model_id ( name, mobile_brands!brand_id ( name ) ),
      suppliers!supplier_id ( name ),
      purchase_invoices!invoice_id ( invoice_number )
    `)
    .or(`imei1.eq.${clean},imei2.eq.${clean}`)
    .limit(1)

  if (devices && devices.length > 0) {
    const d = devices[0] as Record<string, unknown>
    const model   = d['mobile_models']          as Record<string, unknown> | null
    const brand   = model?.['mobile_brands']    as Record<string, unknown> | null
    const supplier = d['suppliers']             as Record<string, unknown> | null
    const inv     = d['purchase_invoices']      as Record<string, unknown> | null
    return {
      kind: 'device',
      id:   String(d['id']),
      imei1: String(d['imei1']),
      imei2: d['imei2'] as string | null,
      brand: String(brand?.['name'] ?? '—'),
      model: String(model?.['name'] ?? '—'),
      storage: d['storage'] as string | null,
      color:   d['color']   as string | null,
      condition: String(d['condition']),
      status:    String(d['status']),
      cost_price:    Number(d['cost_price']           ?? 0),
      selling_price: Number(d['selling_price']        ?? 0),
      actual_selling_price: d['actual_selling_price'] ? Number(d['actual_selling_price']) : null,
      warranty_months: d['warranty_months'] ? Number(d['warranty_months']) : null,
      supplier_name:   supplier?.['name'] as string | null,
      invoice_number:  inv?.['invoice_number'] as string | null,
    }
  }

  // 2. Try product SKU / barcode
  const { data: products } = await supabase
    .from('products')
    .select(`id, name, sku, barcode, unit, stock_qty, cost_price, selling_price, reorder_level, product_categories!category_id ( name )`)
    .or(`sku.eq.${clean},barcode.eq.${clean}`)
    .limit(1)

  if (products && products.length > 0) {
    const p = products[0] as Record<string, unknown>
    const cat = p['product_categories'] as Record<string, unknown> | null
    return {
      kind: 'product',
      id:   String(p['id']),
      name: String(p['name']),
      sku:  p['sku']     as string | null,
      barcode: p['barcode'] as string | null,
      category: String(cat?.['name'] ?? '—'),
      unit: String(p['unit'] ?? 'قطعة'),
      stock_qty:    Number(p['stock_qty']    ?? 0),
      cost_price:   Number(p['cost_price']   ?? 0),
      selling_price: Number(p['selling_price'] ?? 0),
      reorder_level: p['reorder_level'] ? Number(p['reorder_level']) : null,
    }
  }

  return null
}

// ── Device Card ───────────────────────────────────────────────────────────────

function DeviceCard({ device, onEdit, onSell, onClose }: {
  device: DeviceResult
  onEdit: () => void
  onSell: () => void
  onClose: () => void
}) {
  const st = STATUS[device.status] ?? { label: device.status, color: 'text-gray-500' }
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl px-4 py-3">
        <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0">
          <Smartphone size={20} className="text-blue-600 dark:text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-900 dark:text-white">{device.brand} {device.model}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">{device.imei1}</p>
        </div>
        <span className={cn('text-xs font-bold', st.color)}>{st.label}</span>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-2 gap-2">
        {[
          device.storage     && ['التخزين',   device.storage],
          device.color       && ['اللون',      device.color],
          ['الحالة',          COND[device.condition] ?? device.condition],
          device.warranty_months && ['الضمان', `${device.warranty_months} شهر`],
          device.imei2       && ['IMEI 2',     device.imei2],
          device.supplier_name && ['المورد',   device.supplier_name],
          device.invoice_number && ['الفاتورة', device.invoice_number],
        ].flatMap(x => x ? [x as [string,string]] : []).map(([l, v]) => (
          <div key={l} className="bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2 border border-gray-200 dark:border-gray-700">
            <div className="text-xs text-gray-400 dark:text-gray-500">{l}</div>
            <div className="text-xs font-semibold text-gray-900 dark:text-white mt-0.5 font-mono">{v}</div>
          </div>
        ))}
      </div>

      {/* Prices */}
      <div className="flex gap-2">
        <div className="flex-1 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl px-4 py-3 text-center">
          <div className="text-xs text-gray-500 dark:text-gray-400">سعر الشراء</div>
          <div className="text-lg font-bold text-orange-700 dark:text-orange-400">{fmt(device.cost_price)} ج</div>
        </div>
        <div className="flex-1 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl px-4 py-3 text-center">
          <div className="text-xs text-gray-500 dark:text-gray-400">سعر البيع</div>
          <div className="text-lg font-bold text-green-700 dark:text-green-400">{fmt(device.selling_price)} ج</div>
        </div>
      </div>

      {/* Actions */}
      {device.status === 'in_stock' && (
        <div className="flex gap-2">
          <button onClick={onSell}
            className="flex-1 h-10 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors">
            <DollarSign size={15} /> بيع الجهاز
          </button>
          <button onClick={onEdit}
            className="flex-1 h-10 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <Settings size={15} /> تعديل
          </button>
        </div>
      )}
      {device.status !== 'in_stock' && (
        <button onClick={onEdit}
          className="w-full h-10 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
          <Edit3 size={15} /> تعديل البيانات
        </button>
      )}
    </div>
  )
}

// ── Product Card ──────────────────────────────────────────────────────────────

function ProductCard({ product, onEdit }: {
  product: ProductResult
  onEdit: () => void
}) {
  const isLow = product.reorder_level !== null && product.stock_qty <= product.reorder_level
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl px-4 py-3">
        <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center flex-shrink-0">
          <Package size={20} className="text-purple-600 dark:text-purple-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-900 dark:text-white">{product.name}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{product.category}</p>
        </div>
        <span className={cn('text-xs font-bold flex items-center gap-1',
          isLow ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400')}>
          {isLow ? <AlertCircle size={12} /> : <CheckCircle size={12} />}
          {product.stock_qty} {product.unit}
        </span>
      </div>

      {/* Details */}
      <div className="grid grid-cols-2 gap-2">
        {[
          product.sku     && ['SKU',      product.sku],
          product.barcode && ['Barcode',  product.barcode],
          ['المخزون',      `${product.stock_qty} ${product.unit}`],
          product.reorder_level !== null && ['الحد الأدنى', String(product.reorder_level)],
        ].flatMap(x => x ? [x as [string,string]] : []).map(([l, v]) => (
          <div key={l} className="bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2 border border-gray-200 dark:border-gray-700">
            <div className="text-xs text-gray-400 dark:text-gray-500">{l}</div>
            <div className="text-xs font-semibold text-gray-900 dark:text-white mt-0.5">{v}</div>
          </div>
        ))}
      </div>

      {/* Prices */}
      <div className="flex gap-2">
        <div className="flex-1 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl px-4 py-3 text-center">
          <div className="text-xs text-gray-500 dark:text-gray-400">سعر الشراء</div>
          <div className="text-lg font-bold text-orange-700 dark:text-orange-400">{fmt(product.cost_price)} ج</div>
        </div>
        <div className="flex-1 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl px-4 py-3 text-center">
          <div className="text-xs text-gray-500 dark:text-gray-400">سعر البيع</div>
          <div className="text-lg font-bold text-green-700 dark:text-green-400">{fmt(product.selling_price)} ج</div>
        </div>
      </div>

      {/* Edit */}
      <button onClick={onEdit}
        className="w-full h-10 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
        <Settings size={15} /> تعديل السعر والمواصفات
      </button>
    </div>
  )
}

// ── Edit Price Modal ──────────────────────────────────────────────────────────

function EditPricePanel({ result, onSave, onCancel }: {
  result: ScanResult & object
  onSave: () => void
  onCancel: () => void
}) {
  const [price, setPrice] = useState(
    result && 'selling_price' in result ? String((result as DeviceResult | ProductResult).selling_price) : ''
  )
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  async function handleSave() {
    const p = Number(price)
    if (!p || p <= 0) return setError('أدخل سعر صحيح')
    setSaving(true)
    try {
      if (result && 'kind' in result) {
        if ((result as DeviceResult | ProductResult).kind === 'device') {
          await supabase.from('mobile_devices').update({ selling_price: p } as never).eq('id', (result as DeviceResult).id)
        } else {
          await supabase.from('products').update({ selling_price: p } as never).eq('id', (result as ProductResult).id)
        }
      }
      onSave()
    } catch { setError('حدث خطأ') }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={onCancel} className="text-blue-600 dark:text-blue-400 text-sm hover:underline">← رجوع</button>
        <span className="text-sm font-bold text-gray-900 dark:text-white">تعديل سعر البيع</span>
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">السعر الجديد (ج)</label>
        <input type="number" min="0" step="0.01" value={price}
          onChange={e => setPrice(e.target.value)} autoFocus
          className="h-12 border border-gray-200 dark:border-gray-700 rounded-xl px-4 text-lg font-bold bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10" />
      </div>
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      <button onClick={() => void handleSave()} disabled={saving}
        className="w-full h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50">
        {saving && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
        <Tag size={14} /> حفظ السعر
      </button>
    </div>
  )
}

// ── Main Modal ────────────────────────────────────────────────────────────────

export function QuickScanModal({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [showScanner, setShowScanner] = useState(false)
  const [loading,     setLoading]     = useState(false)
  const [result,      setResult]      = useState<ScanResult>(null)
  const [notFound,    setNotFound]    = useState(false)
  const [lastCode,    setLastCode]    = useState('')
  const [showEdit,    setShowEdit]    = useState(false)

  const handleScan = useCallback(async (code: string) => {
    setShowScanner(false)
    setLoading(true)
    setNotFound(false)
    setResult(null)
    setLastCode(code)
    try {
      const found = await lookupCode(code)
      if (found) setResult(found)
      else        setNotFound(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useUsbScanner(handleScan, !showScanner)

  function handleSell() {
    if (!result || result.kind !== 'device') return
    onClose()
    navigate('/pos')
  }

  function handleEditSaved() {
    setShowEdit(false)
    void qc.invalidateQueries({ queryKey: ['devices'] })
    void qc.invalidateQueries({ queryKey: ['products'] })
    // Re-fetch result
    if (lastCode) void handleScan(lastCode)
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-l from-blue-50 to-white dark:from-blue-900/20 dark:to-gray-900">
          <div className="flex items-center gap-2">
            <ScanLine size={18} className="text-blue-600 dark:text-blue-400" />
            <h2 className="text-base font-bold text-gray-900 dark:text-white">مسح سريع</h2>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 min-h-[300px]">
          {/* Scan button — always visible */}
          {!showEdit && (
            <button onClick={() => setShowScanner(true)}
              className="w-full h-12 rounded-xl border-2 border-dashed border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/10 text-blue-600 dark:text-blue-400 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-blue-100 dark:hover:bg-blue-900/20 transition-colors mb-4">
              <ScanLine size={18} /> امسح الباركود أو QR Code
            </button>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center gap-3 py-12">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-500 dark:text-gray-400">جاري البحث...</p>
            </div>
          )}

          {/* Not found */}
          {!loading && notFound && (
            <div className="flex flex-col items-center justify-center gap-3 py-8 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl">
              <AlertCircle size={28} className="text-red-500" />
              <p className="text-sm font-semibold text-red-700 dark:text-red-400">لم يُعثر على نتيجة</p>
              <p className="text-xs text-red-500 font-mono">{lastCode}</p>
              <p className="text-xs text-gray-400">تأكد إن الكود مسجل في النظام</p>
            </div>
          )}

          {/* Result */}
          {!loading && result && !showEdit && (
            result.kind === 'device'
              ? <DeviceCard
                  device={result}
                  onEdit={() => setShowEdit(true)}
                  onSell={handleSell}
                  onClose={onClose}
                />
              : <ProductCard
                  product={result}
                  onEdit={() => setShowEdit(true)}
                />
          )}

          {/* Edit panel */}
          {!loading && result && showEdit && (
            <EditPricePanel
              result={result}
              onSave={handleEditSaved}
              onCancel={() => setShowEdit(false)}
            />
          )}

          {/* Empty state */}
          {!loading && !result && !notFound && (
            <div className="flex flex-col items-center justify-center gap-3 py-8 text-gray-400 dark:text-gray-600">
              <ScanLine size={40} className="opacity-30" />
              <p className="text-sm">امسح IMEI الجهاز أو باركود المنتج</p>
              <p className="text-xs">يعمل مع كاميرا الموبايل والـ USB Scanner</p>
            </div>
          )}
        </div>

        {/* Scanner */}
        {showScanner && (
          <BarcodeScanner
            title="مسح سريع"
            placeholder="IMEI أو باركود أو QR..."
            onScan={handleScan}
            onClose={() => setShowScanner(false)}
          />
        )}
      </div>
    </div>
  )
}
