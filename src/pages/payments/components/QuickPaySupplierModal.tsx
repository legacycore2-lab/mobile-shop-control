// src/pages/payments/components/QuickPaySupplierModal.tsx
// @ts-nocheck
import { useState, useEffect } from 'react'
import { Banknote } from 'lucide-react'
import { cn } from '@/lib/cn'
import { fmt } from '@/constants/statusMaps'
import { paymentsService } from '@/services/payments.service'
import { useAuth } from '@/lib/auth'
import { useQueryClient } from '@tanstack/react-query'

const METHODS = [
  { value: 'cash',          label: 'نقدي'       },
  { value: 'bank_transfer', label: 'تحويل بنكي' },
  { value: 'check',         label: 'شيك'        },
  { value: 'other',         label: 'أخرى'       },
]

export function QuickPaySupplierModal({
  supplierId, supplierName, totalBalance, onClose
}: {
  supplierId: string; supplierName: string; totalBalance: number; onClose: () => void
}) {
  const { profile }  = useAuth()
  const qc           = useQueryClient()
  const [invoices,   setInvoices] = useState<Awaited<ReturnType<typeof paymentsService.getPurchaseInvoicesBySupplier>>>([])
  const [amount,     setAmount]   = useState(String(totalBalance))
  const [method,     setMethod]   = useState('cash')
  const [date,       setDate]     = useState(new Date().toISOString().split('T')[0])
  const [notes,      setNotes]    = useState('')
  const [saving,     setSaving]   = useState(false)
  const [error,      setError]    = useState('')

  useEffect(() => {
    paymentsService.getPurchaseInvoicesBySupplier(supplierId).then(data => {
      setInvoices(data.filter(i => i.remaining > 0))
    })
  }, [supplierId])

  const amt       = Number(amount) || 0
  const isPartial = amt > 0 && amt < totalBalance
  const isOver    = amt > totalBalance

  async function handlePay() {
    setError('')
    if (!amt || amt <= 0) return setError('أدخل مبلغ صحيح')
    setSaving(true)
    try {
      let remaining = amt
      const sorted  = [...invoices].sort((a, b) => new Date(a.invoice_date).getTime() - new Date(b.invoice_date).getTime())
      for (const inv of sorted) {
        if (remaining <= 0) break
        const toPay = Math.min(remaining, inv.remaining)
        await paymentsService.create({
          payment_type: 'purchase', invoice_id: inv.id, invoice_number: inv.invoice_number,
          party_type: 'supplier', party_id: supplierId,
          amount: toPay, payment_method: method, payment_date: date,
          notes: notes || '', created_by: profile?.id ?? '',
        })
        remaining -= toPay
      }
      if (remaining > 0 && sorted.length > 0) {
        const last = sorted[sorted.length - 1]
        await paymentsService.create({
          payment_type: 'purchase', invoice_id: last.id, invoice_number: last.invoice_number,
          party_type: 'supplier', party_id: supplierId,
          amount: remaining, payment_method: method, payment_date: date,
          notes: notes ? `${notes} (رصيد دائن)` : 'رصيد دائن', created_by: profile?.id ?? '',
        })
      }
      await qc.invalidateQueries({ queryKey: ['payments'] })
      await qc.invalidateQueries({ queryKey: ['ledger', 'suppliers'] })
      onClose()
    } catch (err) { setError(err instanceof Error ? err.message : 'حدث خطأ') }
    finally { setSaving(false) }
  }

  const inp = 'h-10 border border-gray-200 dark:border-gray-700 rounded-lg px-3 text-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 transition-all w-full'

  return (
    <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <Banknote size={16} className="text-green-600" />
            <div>
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">سداد — {supplierName}</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">المديونية الكلية: {fmt(totalBalance)} ج</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-400 hover:text-gray-600">
            <span className="text-lg leading-none">×</span>
          </button>
        </div>
        <div className="p-5 space-y-4">
          {/* Quick amount buttons */}
          <div className="flex gap-2">
            {([['الكل', totalBalance], ['النصف', Math.floor(totalBalance / 2)], ['الربع', Math.floor(totalBalance / 4)]] as [string, number][]).map(([label, val]) => (
              <button key={label} onClick={() => setAmount(String(val))}
                className={cn('flex-1 py-2 rounded-lg border text-xs font-semibold transition-colors text-center',
                  Number(amount) === val
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                    : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100')}>
                <div>{label}</div>
                <div className="opacity-70">{fmt(val)} ج</div>
              </button>
            ))}
          </div>
          {/* Amount */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">المبلغ (ج) <span className="text-red-500">*</span></label>
            <input type="number" min="0.01" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} autoFocus className={inp + ' text-lg font-bold'} />
          </div>
          {/* Status */}
          {amt > 0 && (
            <div className={cn('rounded-lg px-3 py-2 text-xs font-medium flex justify-between',
              isOver ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400' :
              isPartial ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400' :
              'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400')}>
              <span>{isOver ? `★ رصيد دائن: ${fmt(amt - totalBalance)} ج` : isPartial ? `سيتبقى: ${fmt(totalBalance - amt)} ج` : '✓ سداد كامل'}</span>
              <span className="font-bold">{fmt(amt)} ج</span>
            </div>
          )}
          {/* Method + Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">طريقة الدفع</label>
              <select value={method} onChange={e => setMethod(e.target.value)} className={inp + ' cursor-pointer'}>
                <option value="cash">نقدي</option>
                <option value="bank_transfer">تحويل بنكي</option>
                <option value="check">شيك</option>
                <option value="other">أخرى</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">التاريخ</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inp} />
            </div>
          </div>
          {/* Notes */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">ملاحظات</label>
            <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="اختياري..." className={inp} />
          </div>
          {/* Open invoices */}
          {invoices.length > 0 && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 space-y-1.5">
              <p className="text-xs font-bold text-gray-500 dark:text-gray-400">الفواتير المفتوحة ({invoices.length})</p>
              {invoices.map(inv => (
                <div key={inv.id} className="flex justify-between text-xs">
                  <span className="text-gray-600 dark:text-gray-400 font-mono">{inv.invoice_number}</span>
                  <span className="font-bold text-red-600 dark:text-red-400">{fmt(inv.remaining)} ج</span>
                </div>
              ))}
            </div>
          )}
          {error && <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
        </div>
        <div className="flex gap-3 px-5 pb-5">
          <button onClick={onClose} className="flex-1 h-10 text-sm font-medium rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 hover:bg-gray-50 transition-colors">إلغاء</button>
          <button onClick={() => void handlePay()} disabled={saving || !amt}
            className="flex-1 h-10 text-sm font-semibold rounded-lg bg-green-600 hover:bg-green-700 text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {saving && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            <Banknote size={14} />
            {isOver ? 'سداد مع رصيد دائن' : isPartial ? `سداد ${fmt(amt)} ج` : 'سداد كامل'}
          </button>
        </div>
      </div>
    </div>
  )
}

