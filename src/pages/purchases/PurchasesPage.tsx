import { useState, useMemo, useEffect } from 'react'
import {
  Plus, Search, Package, Truck, DollarSign,
  CheckCircle, Clock, XCircle, Eye, Trash2,
  ChevronLeft, ChevronRight, X, AlertCircle,
  FileText, Smartphone, Tag, CreditCard,
} from 'lucide-react'
import {
  usePurchases, usePurchaseStats, useCreatePurchase,
  useConfirmPurchase, useCancelPurchase, useDeletePurchase,
  useUpdatePayment, useUnlinkedDevices, usePurchase,
} from '@/hooks/usePurchases'
import { useSuppliers } from '@/hooks/useSuppliers'
import { useProducts } from '@/hooks/useProducts'
import { useAuth } from '@/lib/auth'
import { purchasesService } from '@/services/purchases.service'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/cn'
import type { PurchaseInvoiceView, InvoiceStatus } from '@/types/database'
import type { InvoiceDeviceLine, InvoiceProductLine } from '@/repositories/purchases.repository'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) { return n.toLocaleString('ar-EG') }

const STATUS_MAP: Record<InvoiceStatus, { label: string; variant: 'neutral' | 'success' | 'danger'; icon: React.ElementType }> = {
  draft:     { label: 'مسودة',  variant: 'neutral', icon: Clock       },
  confirmed: { label: 'مؤكدة',  variant: 'success', icon: CheckCircle },
  cancelled: { label: 'ملغاة',  variant: 'danger',  icon: XCircle     },
}

const PAGE_SIZE = 10
type FilterStatus = 'all' | InvoiceStatus

// ── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string | number; sub?: string
  icon: React.ElementType
  color: 'blue' | 'green' | 'amber' | 'red' | 'purple'
}) {
  const C: Record<string, string> = {
    blue:   'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    green:  'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
    amber:  'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',
    red:    'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
    purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
  }
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{label}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
          {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 truncate">{sub}</p>}
        </div>
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', C[color])}>
          <Icon size={18} />
        </div>
      </div>
    </div>
  )
}

// ── Invoice Detail Drawer ─────────────────────────────────────────────────────

function InvoiceDrawer({ invoiceId, onClose }: { invoiceId: string; onClose: () => void }) {
  const { data: detail, isLoading } = usePurchase(invoiceId)
  const confirmMutation  = useConfirmPurchase()
  const cancelMutation   = useCancelPurchase()
  const paymentMutation  = useUpdatePayment()

  const [showPayment, setShowPayment] = useState(false)
  const [paidAmt, setPaidAmt]         = useState('')
  const [discount, setDiscount]       = useState('')
  const [error, setError]             = useState('')

  useEffect(() => {
    if (detail) {
      setPaidAmt(String(detail.invoice.paid_amount))
      setDiscount(String(detail.invoice.discount))
    }
  }, [detail])

  async function handleConfirm() {
    setError('')
    try { await confirmMutation.mutateAsync(invoiceId) }
    catch (e) { setError(e instanceof Error ? e.message : 'خطأ') }
  }

  async function handleCancel() {
    if (!confirm('هل أنت متأكد من إلغاء هذه الفاتورة؟')) return
    setError('')
    try { await cancelMutation.mutateAsync(invoiceId) }
    catch (e) { setError(e instanceof Error ? e.message : 'خطأ') }
  }

  async function handlePayment(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      await paymentMutation.mutateAsync({ id: invoiceId, paid: Number(paidAmt) || 0, discount: Number(discount) || 0 })
      setShowPayment(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطأ')
    }
  }

  const inv = detail?.invoice

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-end"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white dark:bg-gray-900 h-full w-full max-w-md shadow-2xl flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <div>
            <p className="text-base font-bold text-gray-900 dark:text-white font-mono">
              {inv?.invoice_number ?? '...'}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{inv?.supplier_name ?? ''}</p>
          </div>
          <div className="flex items-center gap-2">
            {inv && <Badge variant={STATUS_MAP[inv.status].variant}>{STATUS_MAP[inv.status].label}</Badge>}
            <button onClick={onClose}
              className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-10 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : inv ? (
            <>
              {/* Summary */}
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 space-y-3">
                <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">الملخص المالي</p>
                {[
                  ['تاريخ الفاتورة', new Date(inv.invoice_date).toLocaleDateString('ar-EG')],
                  ['إجمالي الفاتورة', `${fmt(inv.total_amount)} ج.م`],
                  ['الخصم', `${fmt(inv.discount)} ج.م`],
                  ['المدفوع', `${fmt(inv.paid_amount)} ج.م`],
                  ['المتبقي', `${fmt(inv.remaining)} ج.م`],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
                    <span className={cn('text-sm font-bold', label === 'المتبقي' && inv.remaining > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white')}>
                      {value}
                    </span>
                  </div>
                ))}
              </div>

              {/* Devices */}
              {detail.devices.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Smartphone size={12} /> الأجهزة ({detail.devices.length})
                  </p>
                  <div className="space-y-2">
                    {detail.devices.map(d => (
                      <div key={d.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-800/50 rounded-lg px-3 py-2">
                        <div>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">{d.brand_name} {d.model_name}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-600 font-mono">{d.imei1}</p>
                        </div>
                        <span className="text-sm font-bold text-gray-900 dark:text-white whitespace-nowrap">{fmt(d.cost_price)} ج</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Products */}
              {detail.products.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Tag size={12} /> المنتجات ({detail.products.length})
                  </p>
                  <div className="space-y-2">
                    {detail.products.map(p => (
                      <div key={p.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-800/50 rounded-lg px-3 py-2">
                        <div>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">{p.product_name}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-600">{p.quantity} {p.unit} × {fmt(p.unit_price)} ج</p>
                        </div>
                        <span className="text-sm font-bold text-gray-900 dark:text-white whitespace-nowrap">{fmt(p.subtotal)} ج</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {inv.notes && (
                <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900 rounded-xl p-3">
                  <p className="text-xs text-blue-700 dark:text-blue-400">{inv.notes}</p>
                </div>
              )}

              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-2.5 text-sm text-red-700 dark:text-red-400 flex items-center gap-2">
                  <AlertCircle size={14} />
                  {error}
                </div>
              )}

              {/* Payment form */}
              {showPayment && inv.status !== 'cancelled' && (
                <form onSubmit={e => void handlePayment(e)} className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 space-y-3">
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">تحديث الدفع</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">المدفوع (ج.م)</label>
                      <input type="number" min="0" step="0.01" value={paidAmt}
                        onChange={e => setPaidAmt(e.target.value)}
                        className="h-9 border border-gray-200 dark:border-gray-700 rounded-lg px-3 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">الخصم (ج.م)</label>
                      <input type="number" min="0" step="0.01" value={discount}
                        onChange={e => setDiscount(e.target.value)}
                        className="h-9 border border-gray-200 dark:border-gray-700 rounded-lg px-3 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all" />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button type="button" onClick={() => setShowPayment(false)}
                      className="h-8 px-3 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                      إلغاء
                    </button>
                    <button type="submit" disabled={paymentMutation.isPending}
                      className="h-8 px-4 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50">
                      حفظ
                    </button>
                  </div>
                </form>
              )}
            </>
          ) : (
            <p className="text-center text-gray-400 dark:text-gray-600 py-10">لا توجد بيانات</p>
          )}
        </div>

        {/* Actions */}
        {inv && (
          <div className="flex-shrink-0 border-t border-gray-100 dark:border-gray-800 p-4 flex flex-wrap gap-2">
            {inv.status === 'draft' && (
              <>
                <button onClick={handleConfirm} disabled={confirmMutation.isPending}
                  className="flex-1 h-9 text-sm font-semibold rounded-lg bg-green-600 hover:bg-green-700 text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {confirmMutation.isPending && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  <CheckCircle size={14} /> تأكيد
                </button>
                <button onClick={handleCancel} disabled={cancelMutation.isPending}
                  className="h-9 px-3 text-sm font-medium rounded-lg border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50">
                  إلغاء
                </button>
              </>
            )}
            {inv.status !== 'cancelled' && (
              <button onClick={() => setShowPayment(v => !v)}
                className="h-9 px-3 text-sm font-medium rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-2">
                <CreditCard size={14} /> الدفع
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Create Invoice Modal ──────────────────────────────────────────────────────

function CreateModal({ onClose }: { onClose: () => void }) {
  const { profile }              = useAuth()
  const { data: suppliers = [] } = useSuppliers()
  const { data: products  = [] } = useProducts()
  const createMutation           = useCreatePurchase()

  const [supplierId,    setSupplierId]    = useState('')
  const [invoiceDate,   setInvoiceDate]   = useState(new Date().toISOString().split('T')[0])
  const [paidAmount,    setPaidAmount]    = useState('')
  const [discount,      setDiscount]      = useState('0')
  const [notes,         setNotes]         = useState('')
  const [deviceLines,   setDeviceLines]   = useState<InvoiceDeviceLine[]>([])
  const [productLines,  setProductLines]  = useState<InvoiceProductLine[]>([])
  const [error,         setError]         = useState('')
  const [tab,           setTab]           = useState<'devices' | 'products'>('devices')

  const { data: unlinkedDevices = [] } = useUnlinkedDevices(supplierId)

  // ── Device selection
  function toggleDevice(device: { id: string; cost_price: number }) {
    setDeviceLines(prev => {
      const exists = prev.find(l => l.device_id === device.id)
      if (exists) return prev.filter(l => l.device_id !== device.id)
      return [...prev, { device_id: device.id, cost_price: device.cost_price }]
    })
  }

  function updateDeviceCost(deviceId: string, cost: number) {
    setDeviceLines(prev => prev.map(l => l.device_id === deviceId ? { ...l, cost_price: cost } : l))
  }

  // ── Product lines
  function addProduct(productId: string) {
    const product = products.find(p => p.id === productId)
    if (!product) return
    setProductLines(prev => {
      const exists = prev.find(l => l.product_id === productId)
      if (exists) return prev
      return [...prev, { product_id: productId, quantity: 1, unit_price: product.cost_price }]
    })
  }

  function updateProductLine(productId: string, field: 'quantity' | 'unit_price', value: number) {
    setProductLines(prev => prev.map(l => l.product_id === productId ? { ...l, [field]: value } : l))
  }

  function removeProductLine(productId: string) {
    setProductLines(prev => prev.filter(l => l.product_id !== productId))
  }

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
        device_lines:  deviceLines,
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
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={e => void handleSubmit(e)}>
          <div className="px-6 py-5 flex flex-col gap-5 max-h-[70vh] overflow-y-auto">

            {/* Header fields */}
            <div>
              <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">بيانات الفاتورة</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label className={labelCls}>المورد <span className="text-red-500">*</span></label>
                  <select value={supplierId} onChange={e => { setSupplierId(e.target.value); setDeviceLines([]) }}
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

              {/* Devices tab */}
              {tab === 'devices' && (
                <div>
                  {!supplierId ? (
                    <div className="py-6 text-center text-gray-400 dark:text-gray-600 text-sm">
                      اختر المورد أولاً لعرض أجهزته غير المرتبطة بفواتير
                    </div>
                  ) : unlinkedDevices.length === 0 ? (
                    <div className="py-6 text-center text-gray-400 dark:text-gray-600 text-sm">
                      <Smartphone size={28} className="mx-auto mb-2 opacity-30" />
                      <p>لا توجد أجهزة غير مرتبطة لهذا المورد</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {unlinkedDevices.map(d => {
                        const selected = deviceLines.find(l => l.device_id === d.id)
                        return (
                          <div key={d.id}
                            className={cn('flex items-center gap-3 rounded-lg border px-3 py-2 cursor-pointer transition-all',
                              selected
                                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                                : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600')}
                            onClick={() => toggleDevice(d)}>
                            <input type="checkbox" checked={!!selected} onChange={() => toggleDevice(d)}
                              className="accent-blue-600 flex-shrink-0" onClick={e => e.stopPropagation()} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-900 dark:text-white">{d.brand_name} {d.model_name}</p>
                              <p className="text-xs text-gray-400 dark:text-gray-600 font-mono">{d.imei1}</p>
                            </div>
                            {selected ? (
                              <input type="number" min="0" step="0.01"
                                value={selected.cost_price}
                                onChange={e => { e.stopPropagation(); updateDeviceCost(d.id, Number(e.target.value)) }}
                                onClick={e => e.stopPropagation()}
                                className="w-24 h-8 border border-blue-300 dark:border-blue-700 rounded-lg px-2 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 text-center" />
                            ) : (
                              <span className="text-sm font-bold text-gray-900 dark:text-white whitespace-nowrap">{fmt(d.cost_price)} ج</span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Products tab */}
              {tab === 'products' && (
                <div className="space-y-3">
                  <select onChange={e => { addProduct(e.target.value); e.target.value = '' }}
                    className={inputCls + ' cursor-pointer'} defaultValue="">
                    <option value="">+ إضافة منتج</option>
                    {products.filter(p => p.is_active && !productLines.find(l => l.product_id === p.id)).map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>
                    ))}
                  </select>
                  {productLines.length === 0 ? (
                    <div className="py-4 text-center text-gray-400 dark:text-gray-600 text-sm">
                      لم تتم إضافة منتجات بعد
                    </div>
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

            {/* Totals summary */}
            {(deviceLines.length > 0 || productLines.length > 0) && (
              <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-xl p-4 space-y-2">
                <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest">ملخص الفاتورة</p>
                {[
                  ['أجهزة',        `${fmt(deviceTotal)} ج`],
                  ['منتجات',       `${fmt(productTotal)} ج`],
                  ['الإجمالي',     `${fmt(grandTotal)} ج`],
                  ['بعد الخصم',   `${fmt(afterDisc)} ج`],
                  ['المتبقي',      `${fmt(remaining)} ج`],
                ].map(([l, v]) => (
                  <div key={l} className="flex items-center justify-between">
                    <span className="text-xs text-blue-700 dark:text-blue-400">{l}</span>
                    <span className={cn('text-sm font-bold', l === 'المتبقي' && remaining > 0 ? 'text-red-600 dark:text-red-400' : 'text-blue-900 dark:text-blue-100')}>{v}</span>
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
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function PurchasesPage() {
  const { data: invoices = [], isLoading } = usePurchases()
  const { data: stats }                    = usePurchaseStats()
  const deleteMutation                     = useDeletePurchase()

  const [search,   setSearch]   = useState('')
  const [filter,   setFilter]   = useState<FilterStatus>('all')
  const [page,     setPage]     = useState(1)
  const [showCreate, setShowCreate] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return invoices.filter(inv => {
      const matchSearch = !q ||
        inv.invoice_number.toLowerCase().includes(q) ||
        inv.supplier_name.toLowerCase().includes(q)
      const matchFilter = filter === 'all' || inv.status === filter
      return matchSearch && matchFilter
    })
  }, [invoices, search, filter])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  async function handleDelete(id: string, status: InvoiceStatus) {
    if (status === 'confirmed') return
    if (!confirm('هل أنت متأكد من حذف هذه الفاتورة؟')) return
    await deleteMutation.mutateAsync(id)
  }

  const STATS = [
    { label: 'إجمالي الفواتير', value: stats?.total      ?? 0, sub: `${stats?.confirmed ?? 0} مؤكدة`,     icon: FileText,    color: 'blue'   as const },
    { label: 'مسودات',          value: stats?.draft       ?? 0, icon: Clock,       color: 'amber'  as const },
    { label: 'إجمالي المشتريات', value: `${fmt(stats?.totalSpent ?? 0)} ج`, sub: 'من الفواتير المؤكدة', icon: DollarSign,  color: 'purple' as const },
    { label: 'المتبقي (مديونية)', value: `${fmt(stats?.totalDue  ?? 0)} ج`, sub: `مدفوع: ${fmt(stats?.totalPaid ?? 0)} ج`,  icon: CreditCard,  color: (stats?.totalDue ?? 0) > 0 ? 'red' as const : 'green' as const },
  ]

  const FILTER_TABS: { value: FilterStatus; label: string }[] = [
    { value: 'all',       label: 'الكل'    },
    { value: 'draft',     label: 'مسودات' },
    { value: 'confirmed', label: 'مؤكدة'  },
    { value: 'cancelled', label: 'ملغاة'  },
  ]

  return (
    <div className="max-w-7xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">المشتريات</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">فواتير الشراء من الموردين</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="h-9 px-4 text-sm font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors flex items-center gap-2">
          <Plus size={14} /> فاتورة جديدة
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {STATS.map(s => <StatCard key={s.label} {...s} />)}
      </div>

      {/* Toolbar */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="بحث برقم الفاتورة أو المورد..."
            className="w-full h-9 pr-9 pl-3 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {FILTER_TABS.map(({ value, label }) => (
            <button key={value} onClick={() => { setFilter(value); setPage(1) }}
              className={cn('h-8 px-3 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap',
                filter === value
                  ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400'
                  : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700')}>
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
                {['رقم الفاتورة', 'المورد', 'التاريخ', 'الأجهزة', 'المنتجات', 'الإجمالي', 'المدفوع', 'المتبقي', 'الحالة', ''].map((h, i) => (
                  <th key={i} className={cn('px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap text-right', i >= 3 && 'text-center')}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-100 dark:border-gray-800">
                    {Array.from({ length: 10 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-16 text-center text-gray-400 dark:text-gray-600">
                    <Package size={32} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm">لا توجد فواتير</p>
                    <button onClick={() => setShowCreate(true)}
                      className="mt-3 text-xs text-blue-600 dark:text-blue-400 hover:underline">
                      إنشاء فاتورة جديدة
                    </button>
                  </td>
                </tr>
              ) : paginated.map(inv => {
                const st = STATUS_MAP[inv.status]
                return (
                  <tr key={inv.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-mono text-sm font-bold text-gray-900 dark:text-white">{inv.invoice_number}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-600 mt-0.5">{inv.created_by_name}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Truck size={12} className="text-gray-400 dark:text-gray-600 flex-shrink-0" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{inv.supplier_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      {new Date(inv.invoice_date).toLocaleDateString('ar-EG')}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400">
                        <Smartphone size={11} /> {inv.devices_count}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-purple-600 dark:text-purple-400">
                        <Tag size={11} /> {inv.products_count}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-sm font-bold text-gray-900 dark:text-white whitespace-nowrap">
                      {fmt(inv.total_amount)} ج
                    </td>
                    <td className="px-4 py-3 text-center text-sm font-semibold text-green-600 dark:text-green-400 whitespace-nowrap">
                      {fmt(inv.paid_amount)} ج
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn('text-sm font-bold whitespace-nowrap', inv.remaining > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-400 dark:text-gray-600')}>
                        {fmt(inv.remaining)} ج
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={st.variant}>{st.label}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-center">
                        <button title="عرض التفاصيل" onClick={() => setDetailId(inv.id)}
                          className="w-7 h-7 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                          <Eye size={13} />
                        </button>
                        {inv.status === 'draft' && (
                          <button title="حذف" onClick={() => void handleDelete(inv.id, inv.status)}
                            disabled={deleteMutation.isPending}
                            className="w-7 h-7 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-800 transition-colors disabled:opacity-50">
                            <Trash2 size={13} />
                          </button>
                        )}
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
            <span className="font-semibold text-gray-900 dark:text-white">{invoices.length}</span> فاتورة
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
      {showCreate && <CreateModal onClose={() => setShowCreate(false)} />}
      {detailId   && <InvoiceDrawer invoiceId={detailId} onClose={() => setDetailId(null)} />}
    </div>
  )
}
