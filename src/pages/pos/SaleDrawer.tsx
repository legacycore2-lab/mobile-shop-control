// src/pages/pos/SaleDrawer.tsx
import { useState } from 'react'
import { X, Smartphone, Tag, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { useSaleInvoice, useConfirmSale, useCancelSale } from '@/hooks/usePos'
import { useAuth } from '@/lib/auth'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/cn'
import { STATUS_MAP, fmt } from './constants'

export function SaleDrawer({ invoiceId, onClose }: { invoiceId: string; onClose: () => void }) {
  const { profile }                 = useAuth()
  const { data: detail, isLoading } = useSaleInvoice(invoiceId)
  const confirmMutation             = useConfirmSale()
  const cancelMutation              = useCancelSale()
  const [error, setError]           = useState('')

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
    const msg = inv?.status === 'confirmed'
      ? 'سيتم إرجاع الأجهزة والمنتجات للمخزون. هل أنت متأكد من إلغاء الفاتورة المؤكدة؟'
      : 'هل أنت متأكد من إلغاء هذه الفاتورة؟'
    if (!confirm(msg)) return
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

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <div>
            <p className="text-base font-bold text-gray-900 dark:text-white font-mono">{inv?.invoice_number ?? '...'}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{inv?.customer_name ?? 'عميل نقدي'}</p>
          </div>
          <div className="flex items-center gap-2">
            {inv && <Badge variant={STATUS_MAP[inv.status]?.variant ?? 'neutral'}>{STATUS_MAP[inv.status]?.label}</Badge>}
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

              {/* Confirmed warning */}
              {inv.status === 'confirmed' && (
                <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl p-3 flex items-start gap-2">
                  <AlertCircle size={14} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    إلغاء الفاتورة المؤكدة سيُرجع الأجهزة تلقائياً للمخزون ويُستعاد stock المنتجات.
                  </p>
                </div>
              )}

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

        {/* Footer actions */}
        {inv && inv.status !== 'cancelled' && (
          <div className="flex-shrink-0 border-t border-gray-100 dark:border-gray-800 p-4 flex gap-2">
            {inv.status === 'draft' && (
              <button onClick={handleConfirm} disabled={confirmMutation.isPending}
                className="flex-1 h-9 text-sm font-semibold rounded-lg bg-green-600 hover:bg-green-700 text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {confirmMutation.isPending && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                <CheckCircle size={14} /> تأكيد البيع
              </button>
            )}
            <button onClick={handleCancel} disabled={cancelMutation.isPending}
              className={cn(
                'h-9 px-4 text-sm font-medium rounded-lg border transition-colors disabled:opacity-50 flex items-center justify-center gap-2',
                inv.status === 'draft'
                  ? 'border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                  : 'flex-1 border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/10 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/20',
              )}>
              {cancelMutation.isPending && <span className="w-4 h-4 border-2 border-red-400/30 border-t-red-600 rounded-full animate-spin" />}
              <XCircle size={14} />
              {inv.status === 'confirmed' ? 'إلغاء الفاتورة وإرجاع المخزون' : 'إلغاء'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
