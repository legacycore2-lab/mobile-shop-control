import { useState, useEffect } from 'react'
import { Smartphone, Tag, AlertCircle, CheckCircle, CreditCard, X } from 'lucide-react'
import { usePurchase, useConfirmPurchase, useCancelPurchase, useUpdatePayment } from '@/hooks/usePurchases'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/cn'
import { STATUS_MAP, fmt } from './constants'
import type { InvoiceDetail } from '@/repositories/purchases.repository'

export function PurchaseInvoiceDrawer({ invoiceId, onClose }: { invoiceId: string; onClose: () => void }) {
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

