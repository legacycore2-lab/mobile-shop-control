// src/pages/purchases/InvoiceDrawer.tsx
import { useState } from 'react'
import { Smartphone, Tag, AlertCircle, CheckCircle, CreditCard, X, Printer } from 'lucide-react'
import { usePurchase, useConfirmPurchase, useCancelPurchase } from '@/hooks/usePurchases'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/cn'
import { STATUS_MAP, fmt } from './constants'
import { SimplePayModal } from '@/pages/payments/SimplePayModal'
import { BulkLabelPrintModal } from './LabelPrintModal'
import type { InvoiceDetail } from '@/repositories/purchases.repository'

export function PurchaseInvoiceDrawer({ invoiceId, onClose }: { invoiceId: string; onClose: () => void }) {
  const { data: detail, isLoading } = usePurchase(invoiceId)
  const confirmMutation = useConfirmPurchase()
  const cancelMutation  = useCancelPurchase()

  const [showPay,       setShowPay]       = useState(false)
  const [showBulkLabel, setShowBulkLabel] = useState(false)
  const [error,         setError]         = useState('')

  // بعد التأكيد نفتح modal الطباعة مباشرة
  async function handleConfirm() {
    setError('')
    try {
      await confirmMutation.mutateAsync(invoiceId)
      // البيانات اتحدثت بعد الـ mutation — نفتح الـ bulk modal
      setShowBulkLabel(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطأ')
    }
  }

  async function handleCancel() {
    if (!confirm('هل أنت متأكد من إلغاء هذه الفاتورة؟')) return
    setError('')
    try { await cancelMutation.mutateAsync(invoiceId) }
    catch (e) { setError(e instanceof Error ? e.message : 'خطأ') }
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
              {/* Financial Summary */}
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 space-y-3">
                <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">الملخص المالي</p>
                {[
                  ['تاريخ الفاتورة', new Date(inv.invoice_date).toLocaleDateString('ar-EG')],
                  ['إجمالي الفاتورة', `${fmt(inv.total_amount)} ج.م`],
                  ['الخصم',          `${fmt(inv.discount)} ج.م`],
                  ['إجمالي المدفوع', `${fmt(inv.paid_amount)} ج.م`],
                  ['المتبقي',        `${fmt(inv.remaining)} ج.م`],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
                    <span className={cn(
                      'text-sm font-bold',
                      label === 'المتبقي' && inv.remaining > 0
                        ? 'text-red-600 dark:text-red-400'
                        : label === 'إجمالي المدفوع'
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-gray-900 dark:text-white'
                    )}>
                      {value}
                    </span>
                  </div>
                ))}

                {inv.remaining > 0 && inv.status === 'confirmed' && (
                  <button
                    onClick={() => setShowPay(true)}
                    className="w-full mt-1 h-9 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-bold transition-colors flex items-center justify-center gap-2"
                  >
                    <CreditCard size={13} />
                    تسجيل دفعة — المتبقي {fmt(inv.remaining)} ج
                  </button>
                )}

                {inv.remaining === 0 && inv.status === 'confirmed' && (
                  <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-green-600 dark:text-green-400 mt-1">
                    <CheckCircle size={13} />
                    تم السداد بالكامل
                  </div>
                )}
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
            </>
          ) : (
            <p className="text-center text-gray-400 dark:text-gray-600 py-10">لا توجد بيانات</p>
          )}
        </div>

        {/* Actions footer */}
        {inv && (
          <div className="flex-shrink-0 border-t border-gray-100 dark:border-gray-800 p-4 flex flex-wrap gap-2">
            {inv.status === 'draft' && (
              <>
                <button onClick={handleConfirm} disabled={confirmMutation.isPending}
                  className="flex-1 h-9 text-sm font-semibold rounded-lg bg-green-600 hover:bg-green-700 text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {confirmMutation.isPending
                    ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <CheckCircle size={14} />}
                  تأكيد وطباعة الليبلات
                </button>
                <button onClick={handleCancel} disabled={cancelMutation.isPending}
                  className="h-9 px-3 text-sm font-medium rounded-lg border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50">
                  إلغاء
                </button>
              </>
            )}
            {inv.status === 'confirmed' && (
              <div className="flex gap-2 w-full">
                {inv.remaining > 0 && (
                  <button onClick={() => setShowPay(true)}
                    className="flex-1 h-9 text-sm font-semibold rounded-lg bg-green-600 hover:bg-green-700 text-white transition-colors flex items-center justify-center gap-2">
                    <CreditCard size={14} /> تسجيل دفعة
                  </button>
                )}
                {/* زر طباعة الليبلات متاح دايماً للفواتير المؤكدة */}
                <button onClick={() => setShowBulkLabel(true)}
                  className="h-9 px-3 text-sm font-medium rounded-lg border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex items-center gap-2">
                  <Printer size={14} /> ليبلات
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Pay Modal */}
      {showPay && inv && (
        <SimplePayModal
          invoiceId={invoiceId}
          invoiceNumber={inv.invoice_number}
          partyId={inv.supplier_id ?? ''}
          partyName={inv.supplier_name ?? ''}
          partyType="supplier"
          paymentType="purchase"
          remaining={inv.remaining}
          onClose={() => setShowPay(false)}
        />
      )}

      {/* Bulk Label Print Modal */}
      {showBulkLabel && detail && inv && (
        <BulkLabelPrintModal
          devices={detail.devices}
          products={detail.products}
          invoiceNumber={inv.invoice_number}
          supplierName={inv.supplier_name ?? ''}
          onClose={() => setShowBulkLabel(false)}
        />
      )}
    </div>
  )
}
