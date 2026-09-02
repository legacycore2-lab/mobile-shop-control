import { useState, useMemo } from 'react'
import {
  Plus, Search, ShoppingCart, DollarSign,
  CheckCircle, Clock, XCircle, Eye, Trash2,
  ChevronLeft, ChevronRight, X, AlertCircle,
  Smartphone, Tag, TrendingUp, Users, CreditCard, FileText,
} from 'lucide-react'
import {
  useSaleInvoices, useSaleStats, useCreateSale,
  useConfirmSale, useCancelSale, useDeleteSale,
  useInStockDevices, useSaleInvoice,
} from '@/hooks/usePos'
import { useCustomers } from '@/hooks/useCustomers'
import { useProducts } from '@/hooks/useProducts'
import { useAuth } from '@/lib/auth'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/cn'
import { StatCard } from '@/components/shared/StatCard'
import type { SaleInvoiceView } from '@/repositories/pos.repository'
import type { SaleDeviceLine, SaleProductLine } from '@/services/pos.service'
import { INVOICE_STATUS_MAP, fmt } from '@/constants/statusMaps'

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_MAP: Record<string, { label: string; variant: 'neutral' | 'success' | 'danger' }> = {
  draft:     { label: 'مسودة', variant: 'neutral' },
  confirmed: { label: 'مؤكدة', variant: 'success' },
  cancelled: { label: 'ملغاة', variant: 'danger'  },
}

const PAGE_SIZE = 10
type FilterStatus = 'all' | 'draft' | 'confirmed' | 'cancelled'

// ── Stat Card ─────────────────────────────────────────────────────────────────


// ── Sale Detail Drawer ────────────────────────────────────────────────────────

function SaleDrawer({ invoiceId, onClose }: { invoiceId: string; onClose: () => void }) {
  const { profile }              = useAuth()
  const { data: detail, isLoading } = useSaleInvoice(invoiceId)
  const confirmMutation          = useConfirmSale()
  const cancelMutation           = useCancelSale()
  const [error, setError]        = useState('')

  const inv = detail?.invoice

  async function handleConfirm() {
    setError('')
    try {
      await confirmMutation.mutateAsync({
        id:         invoiceId,
        customerId: inv?.customer_id ?? null,
        soldById:   profile?.id ?? '',
      })
    } catch (e) { setError(e instanceof Error ? e.message : 'خطأ') }
  }

  async function handleCancel() {
    if (!confirm('هل أنت متأكد من إلغاء هذه الفاتورة؟')) return
    setError('')
    try { await cancelMutation.mutateAsync(invoiceId) }
    catch (e) { setError(e instanceof Error ? e.message : 'خطأ') }
  }

  // profit
  const totalCost = detail
    ? detail.devices.reduce((s, d) => s + d.cost_price, 0)
    + detail.products.reduce((s, p) => s + p.cost_price * p.quantity, 0)
    : 0
  const profit = inv ? inv.total_amount - totalCost : 0

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-end"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white dark:bg-gray-900 h-full w-full max-w-md shadow-2xl flex flex-col overflow-hidden">

        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <div>
            <p className="text-base font-bold text-gray-900 dark:text-white font-mono">{inv?.invoice_number ?? '...'}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{inv?.customer_name ?? 'عميل نقدي'}</p>
          </div>
          <div className="flex items-center gap-2">
            {inv && <Badge variant={INVOICE_STATUS_MAP[inv.status]?.variant ?? 'neutral'}>{INVOICE_STATUS_MAP[inv.status]?.label}</Badge>}
            <button onClick={onClose}
              className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-10 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : inv ? (
            <>
              {/* Financial summary */}
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 space-y-2.5">
                <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">الملخص المالي</p>
                {[
                  ['التاريخ',      new Date(inv.invoice_date).toLocaleDateString('ar-EG')],
                  ['إجمالي البيع', `${fmt(inv.total_amount)} ج.م`],
                  ['الخصم',        `${fmt(inv.discount)} ج.م`],
                  ['المدفوع',      `${fmt(inv.paid_amount)} ج.م`],
                  ['المتبقي',      `${fmt(inv.remaining)} ج.م`],
                ].map(([l, v]) => (
                  <div key={l} className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 dark:text-gray-400">{l}</span>
                    <span className={cn('text-sm font-bold',
                      l === 'المتبقي' && inv.remaining > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white')}>
                      {v}
                    </span>
                  </div>
                ))}
                {inv.status === 'confirmed' && (
                  <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                    <span className="text-xs text-gray-500 dark:text-gray-400">الربح</span>
                    <span className={cn('text-sm font-bold', profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>
                      {profit >= 0 ? '+' : ''}{fmt(profit)} ج.م
                    </span>
                  </div>
                )}
              </div>

              {/* Devices */}
              {detail.devices.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Smartphone size={12} /> أجهزة ({detail.devices.length})
                  </p>
                  <div className="space-y-2">
                    {detail.devices.map(d => (
                      <div key={d.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-800/50 rounded-lg px-3 py-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">{d.brand_name} {d.model_name}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-600 font-mono">{d.imei1}</p>
                        </div>
                        <div className="text-left flex-shrink-0 mr-2">
                          <p className="text-sm font-bold text-gray-900 dark:text-white whitespace-nowrap">{fmt(d.actual_selling_price)} ج</p>
                          <p className="text-xs text-gray-400 dark:text-gray-600">تكلفة: {fmt(d.cost_price)} ج</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Products */}
              {detail.products.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Tag size={12} /> منتجات ({detail.products.length})
                  </p>
                  <div className="space-y-2">
                    {detail.products.map(p => (
                      <div key={p.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-800/50 rounded-lg px-3 py-2">
                        <div className="flex-1 min-w-0">
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
                  <AlertCircle size={14} /> {error}
                </div>
              )}
            </>
          ) : null}
        </div>

        {inv && inv.status === 'draft' && (
          <div className="flex-shrink-0 border-t border-gray-100 dark:border-gray-800 p-4 flex gap-2">
            <button onClick={handleConfirm} disabled={confirmMutation.isPending}
              className="flex-1 h-9 text-sm font-semibold rounded-lg bg-green-600 hover:bg-green-700 text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {confirmMutation.isPending && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              <CheckCircle size={14} /> تأكيد البيع
            </button>
            <button onClick={handleCancel} disabled={cancelMutation.isPending}
              className="h-9 px-3 text-sm font-medium rounded-lg border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50">
              إلغاء
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Create Sale Modal ─────────────────────────────────────────────────────────

function CreateSaleModal({ onClose }: { onClose: () => void }) {
  const { profile }                = useAuth()
  const { data: customers  = [] }  = useCustomers()
  const { data: products   = [] }  = useProducts()
  const { data: inStock    = [] }  = useInStockDevices()
  const createMutation             = useCreateSale()

  const [customerId,    setCustomerId]    = useState('')
  const [invoiceDate,   setInvoiceDate]   = useState(new Date().toISOString().split('T')[0])
  const [paidAmount,    setPaidAmount]    = useState('')
  const [discount,      setDiscount]      = useState('0')
  const [notes,         setNotes]         = useState('')
  const [deviceLines,   setDeviceLines]   = useState<SaleDeviceLine[]>([])
  const [productLines,  setProductLines]  = useState<SaleProductLine[]>([])
  const [error,         setError]         = useState('')
  const [tab,           setTab]           = useState<'devices' | 'products'>('devices')
  const [deviceSearch,  setDeviceSearch]  = useState('')

  const filteredDevices = useMemo(() => {
    const q = deviceSearch.toLowerCase()
    return inStock.filter(d =>
      !q ||
      d.imei1.includes(q) ||
      d.brand_name.toLowerCase().includes(q) ||
      d.model_name.toLowerCase().includes(q)
    )
  }, [inStock, deviceSearch])

  function toggleDevice(device: { id: string; selling_price: number | null; cost_price: number }) {
    setDeviceLines(prev => {
      const exists = prev.find(l => l.device_id === device.id)
      if (exists) return prev.filter(l => l.device_id !== device.id)
      return [...prev, { device_id: device.id, actual_selling_price: device.selling_price ?? device.cost_price }]
    })
  }

  function updateDevicePrice(deviceId: string, price: number) {
    setDeviceLines(prev => prev.map(l => l.device_id === deviceId ? { ...l, actual_selling_price: price } : l))
  }

  function addProduct(productId: string) {
    const product = products.find(p => p.id === productId)
    if (!product) return
    setProductLines(prev => {
      if (prev.find(l => l.product_id === productId)) return prev
      return [...prev, { product_id: productId, quantity: 1, unit_price: product.selling_price }]
    })
  }

  function updateProductLine(productId: string, field: 'quantity' | 'unit_price', value: number) {
    setProductLines(prev => prev.map(l => l.product_id === productId ? { ...l, [field]: value } : l))
  }

  function removeProductLine(productId: string) {
    setProductLines(prev => prev.filter(l => l.product_id !== productId))
  }

  const deviceTotal  = deviceLines .reduce((s, l) => s + l.actual_selling_price,    0)
  const productTotal = productLines.reduce((s, l) => s + l.unit_price * l.quantity, 0)
  const grandTotal   = deviceTotal + productTotal
  const afterDisc    = Math.max(0, grandTotal - (Number(discount) || 0))
  const remaining    = Math.max(0, afterDisc - (Number(paidAmount) || 0))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      await createMutation.mutateAsync({
        customer_id:   customerId || '',
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

        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white">فاتورة بيع جديدة</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">نقطة البيع</p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={e => void handleSubmit(e)}>
          <div className="px-6 py-5 flex flex-col gap-5 max-h-[70vh] overflow-y-auto">

            {/* Header */}
            <div>
              <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">بيانات الفاتورة</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label className={labelCls}>العميل</label>
                  <select value={customerId} onChange={e => setCustomerId(e.target.value)}
                    className={inputCls + ' cursor-pointer'}>
                    <option value="">عميل نقدي (بدون تسجيل)</option>
                    {customers.filter(c => c.is_active).map(c => (
                      <option key={c.id} value={c.id}>{c.name}{c.phone ? ` — ${c.phone}` : ''}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className={labelCls}>تاريخ الفاتورة</label>
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

            {/* Items */}
            <div>
              <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">بنود البيع</p>
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

              {tab === 'devices' && (
                <div className="space-y-2">
                  <div className="relative">
                    <Search size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input value={deviceSearch} onChange={e => setDeviceSearch(e.target.value)}
                      placeholder="بحث بـ IMEI أو الماركة..."
                      className="w-full h-9 pr-9 pl-3 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all" />
                  </div>
                  {filteredDevices.length === 0 ? (
                    <div className="py-6 text-center text-gray-400 dark:text-gray-600 text-sm">
                      <Smartphone size={28} className="mx-auto mb-2 opacity-30" />
                      <p>لا توجد أجهزة في المخزون</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-52 overflow-y-auto">
                      {filteredDevices.map(d => {
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
                              <p className="text-xs text-gray-400 dark:text-gray-600 font-mono">{d.imei1}{d.storage ? ` · ${d.storage}` : ''}</p>
                            </div>
                            {selected ? (
                              <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                                <span className="text-xs text-gray-400">سعر:</span>
                                <input type="number" min="0" step="0.01"
                                  value={selected.actual_selling_price}
                                  onChange={e => updateDevicePrice(d.id, Number(e.target.value))}
                                  className="w-24 h-8 border border-blue-300 dark:border-blue-700 rounded-lg px-2 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 text-center" />
                                <span className="text-xs text-gray-400">ج</span>
                              </div>
                            ) : (
                              <div className="text-left flex-shrink-0">
                                <p className="text-sm font-bold text-gray-900 dark:text-white whitespace-nowrap">{fmt(d.selling_price ?? d.cost_price)} ج</p>
                                <p className="text-xs text-gray-400 dark:text-gray-600">تكلفة: {fmt(d.cost_price)} ج</p>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {tab === 'products' && (
                <div className="space-y-3">
                  <select onChange={e => { addProduct(e.target.value); e.target.value = '' }}
                    className={inputCls + ' cursor-pointer'} defaultValue="">
                    <option value="">+ إضافة منتج</option>
                    {products.filter(p => p.is_active && p.stock_qty > 0 && !productLines.find(l => l.product_id === p.id)).map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.stock_qty} {p.unit})</option>
                    ))}
                  </select>
                  {productLines.length === 0 ? (
                    <div className="py-4 text-center text-gray-400 dark:text-gray-600 text-sm">لم تتم إضافة منتجات بعد</div>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {productLines.map(line => {
                        const product = products.find(p => p.id === line.product_id)
                        return (
                          <div key={line.product_id} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{product?.name}</p>
                              <p className="text-xs text-gray-400 dark:text-gray-600">متاح: {product?.stock_qty}</p>
                            </div>
                            <input type="number" min="1" max={product?.stock_qty} value={line.quantity}
                              onChange={e => updateProductLine(line.product_id, 'quantity', Number(e.target.value))}
                              className="w-14 h-8 border border-gray-200 dark:border-gray-700 rounded-lg px-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-center focus:outline-none focus:border-blue-500" />
                            <span className="text-xs text-gray-400">×</span>
                            <input type="number" min="0" step="0.01" value={line.unit_price}
                              onChange={e => updateProductLine(line.product_id, 'unit_price', Number(e.target.value))}
                              className="w-20 h-8 border border-gray-200 dark:border-gray-700 rounded-lg px-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-center focus:outline-none focus:border-blue-500" />
                            <span className="text-xs text-gray-500 dark:text-gray-400 w-16 text-left whitespace-nowrap">
                              = {fmt(line.quantity * line.unit_price)} ج
                            </span>
                            <button type="button" onClick={() => removeProductLine(line.product_id)}
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors">
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
              <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-xl p-4 space-y-2">
                <p className="text-xs font-bold text-green-600 dark:text-green-400 uppercase tracking-widest">ملخص الفاتورة</p>
                {[
                  ['أجهزة',       `${fmt(deviceTotal)} ج`],
                  ['منتجات',      `${fmt(productTotal)} ج`],
                  ['الإجمالي',    `${fmt(grandTotal)} ج`],
                  ['بعد الخصم',  `${fmt(afterDisc)} ج`],
                  ['المتبقي',     `${fmt(remaining)} ج`],
                ].map(([l, v]) => (
                  <div key={l} className="flex items-center justify-between">
                    <span className="text-xs text-green-700 dark:text-green-400">{l}</span>
                    <span className={cn('text-sm font-bold', l === 'المتبقي' && remaining > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-900 dark:text-green-100')}>{v}</span>
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

          <div className="flex gap-3 justify-end px-6 py-4 border-t border-gray-100 dark:border-gray-800">
            <button type="button" onClick={onClose}
              className="h-9 px-4 text-sm font-medium rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              إلغاء
            </button>
            <button type="submit" disabled={createMutation.isPending}
              className="h-9 px-5 text-sm font-semibold rounded-lg bg-green-600 hover:bg-green-700 text-white transition-colors disabled:opacity-50 flex items-center gap-2">
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

export function PosPage() {
  const { data: invoices = [], isLoading } = useSaleInvoices()
  const { data: stats }                    = useSaleStats()
  const deleteMutation                     = useDeleteSale()

  const [search,     setSearch]     = useState('')
  const [filter,     setFilter]     = useState<FilterStatus>('all')
  const [page,       setPage]       = useState(1)
  const [showCreate, setShowCreate] = useState(false)
  const [detailId,   setDetailId]   = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return invoices.filter(inv => {
      const matchSearch = !q ||
        inv.invoice_number.toLowerCase().includes(q) ||
        (inv.customer_name ?? '').toLowerCase().includes(q)
      const matchFilter = filter === 'all' || inv.status === filter
      return matchSearch && matchFilter
    })
  }, [invoices, search, filter])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  async function handleDelete(inv: SaleInvoiceView) {
    if (inv.status === 'confirmed') return
    if (!confirm('هل أنت متأكد من حذف هذه الفاتورة؟')) return
    await deleteMutation.mutateAsync(inv.id)
  }

  const STATS = [
    { label: 'فواتير البيع',    value: stats?.total       ?? 0, sub: `${stats?.confirmed ?? 0} مؤكدة`, icon: ShoppingCart, color: 'blue'   as const },
    { label: 'مسودات',          value: stats?.draft       ?? 0, icon: Clock,       color: 'amber'  as const },
    { label: 'إجمالي المبيعات', value: `${fmt(stats?.totalRevenue ?? 0)} ج`, sub: 'من الفواتير المؤكدة', icon: TrendingUp,  color: 'green'  as const },
    { label: 'المتبقي للتحصيل', value: `${fmt(stats?.totalDue ?? 0)} ج`, sub: `مدفوع: ${fmt(stats?.totalPaid ?? 0)} ج`, icon: CreditCard, color: (stats?.totalDue ?? 0) > 0 ? 'red' as const : 'teal' as const },
  ]

  const FILTER_TABS: { value: FilterStatus; label: string }[] = [
    { value: 'all',       label: 'الكل'   },
    { value: 'draft',     label: 'مسودات' },
    { value: 'confirmed', label: 'مؤكدة'  },
    { value: 'cancelled', label: 'ملغاة'  },
  ]

  return (
    <div className="max-w-7xl mx-auto space-y-5">

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">نقطة البيع</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">فواتير البيع وإدارة المبيعات</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="h-9 px-4 text-sm font-semibold rounded-lg bg-green-600 hover:bg-green-700 text-white transition-colors flex items-center gap-2">
          <Plus size={14} /> فاتورة بيع جديدة
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {STATS.map(s => <StatCard key={s.label} {...s} />)}
      </div>

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="بحث برقم الفاتورة أو اسم العميل..."
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

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                {['رقم الفاتورة', 'العميل', 'التاريخ', 'أجهزة', 'منتجات', 'الإجمالي', 'المدفوع', 'المتبقي', 'الحالة', ''].map((h, i) => (
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
                    <ShoppingCart size={32} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm">لا توجد فواتير بيع</p>
                    <button onClick={() => setShowCreate(true)}
                      className="mt-3 text-xs text-blue-600 dark:text-blue-400 hover:underline">
                      إنشاء فاتورة جديدة
                    </button>
                  </td>
                </tr>
              ) : paginated.map(inv => (
                <tr key={inv.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-mono text-sm font-bold text-gray-900 dark:text-white">{inv.invoice_number}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-600 mt-0.5">{inv.created_by_name}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <Users size={12} className="text-gray-400 dark:text-gray-600 flex-shrink-0" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{inv.customer_name ?? 'نقدي'}</span>
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
                    <span className={cn('text-sm font-bold whitespace-nowrap',
                      inv.remaining > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-400 dark:text-gray-600')}>
                      {fmt(inv.remaining)} ج
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={INVOICE_STATUS_MAP[inv.status]?.variant ?? 'neutral'}>
                      {INVOICE_STATUS_MAP[inv.status]?.label}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-center">
                      <button title="عرض" onClick={() => setDetailId(inv.id)}
                        className="w-7 h-7 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <Eye size={13} />
                      </button>
                      {inv.status === 'draft' && (
                        <button title="حذف" onClick={() => void handleDelete(inv)}
                          disabled={deleteMutation.isPending}
                          className="w-7 h-7 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-800 transition-colors disabled:opacity-50">
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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

      {showCreate && <CreateSaleModal onClose={() => setShowCreate(false)} />}
      {detailId   && <SaleDrawer invoiceId={detailId} onClose={() => setDetailId(null)} />}
    </div>
  )
}
