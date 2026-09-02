import { useState, useEffect } from 'react'
import { Plus, X, Smartphone, Tag, AlertCircle, FileText, CreditCard } from 'lucide-react'
import { useCreatePurchase, useUnlinkedDevices } from '@/hooks/usePurchases'
import { useSuppliers } from '@/hooks/useSuppliers'
import { useProducts } from '@/hooks/useProducts'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/cn'
import { fmt } from './constants'
import type { InvoiceDeviceLine, InvoiceProductLine } from '@/repositories/purchases.repository'

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

