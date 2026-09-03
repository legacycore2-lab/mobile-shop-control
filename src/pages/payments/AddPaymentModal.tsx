// src/pages/payments/AddPaymentModal.tsx
import { useState } from 'react'
import { X, DollarSign, AlertCircle } from 'lucide-react'
import { useCreatePayment } from '@/hooks/usePayments'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/cn'
import type { PaymentType, PartyType } from '@/types/database'

const METHODS = [
  { value: 'cash',          label: 'نقدي'        },
  { value: 'bank_transfer', label: 'تحويل بنكي'  },
  { value: 'check',         label: 'شيك'          },
  { value: 'other',         label: 'أخرى'         },
]

interface AddPaymentModalProps {
  invoiceId:     string
  invoiceNumber: string
  partyId:       string
  partyName:     string
  partyType:     PartyType
  paymentType:   PaymentType
  remaining:     number
  onClose:       () => void
}

export function AddPaymentModal({
  invoiceId, invoiceNumber, partyId, partyName,
  partyType, paymentType, remaining, onClose,
}: AddPaymentModalProps) {
  const { profile }     = useAuth()
  const createPayment   = useCreatePayment()

  const [amount,        setAmount]        = useState(String(remaining > 0 ? remaining : ''))
  const [method,        setMethod]        = useState('cash')
  const [paymentDate,   setPaymentDate]   = useState(new Date().toISOString().split('T')[0])
  const [notes,         setNotes]         = useState('')
  const [error,         setError]         = useState('')

  const inp = 'h-10 border border-gray-200 dark:border-gray-700 rounded-lg px-3 text-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all w-full'

  async function handleSubmit() {
    setError('')
    const amt = Number(amount)
    if (!amt || amt <= 0) return setError('أدخل مبلغ صحيح أكبر من صفر')
    try {
      await createPayment.mutateAsync({
        payment_type:   paymentType,
        invoice_id:     invoiceId,
        invoice_number: invoiceNumber,
        party_type:     partyType,
        party_id:       partyId,
        amount:         amt,
        payment_method: method,
        payment_date:   paymentDate,
        notes,
        created_by:     profile?.id ?? '',
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <DollarSign size={16} className="text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">تسجيل دفعة جديدة</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">{invoiceNumber} — {partyName}</p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Remaining banner */}
          {remaining > 0 && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-2.5 flex items-center justify-between">
              <span className="text-xs text-amber-700 dark:text-amber-400">المتبقي على الفاتورة</span>
              <span className="text-sm font-bold text-amber-700 dark:text-amber-400">{remaining.toLocaleString('ar-EG')} ج</span>
            </div>
          )}

          {/* Amount */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">المبلغ المدفوع (ج) <span className="text-red-500">*</span></label>
            <input type="number" min="0.01" step="0.01" value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0.00" className={inp} autoFocus />
          </div>

          {/* Method + Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">طريقة الدفع</label>
              <select value={method} onChange={e => setMethod(e.target.value)} className={inp + ' cursor-pointer'}>
                {METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">تاريخ الدفع</label>
              <input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} className={inp} />
            </div>
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">ملاحظات</label>
            <input value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="اختياري..." className={inp} />
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-2.5 text-sm text-red-700 dark:text-red-400 flex items-center gap-2">
              <AlertCircle size={14} /> {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 pb-5">
          <button onClick={onClose}
            className="flex-1 h-10 text-sm font-medium rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            إلغاء
          </button>
          <button onClick={() => void handleSubmit()} disabled={createPayment.isPending}
            className={cn(
              'flex-1 h-10 text-sm font-semibold rounded-lg bg-green-600 hover:bg-green-700 text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2'
            )}>
            {createPayment.isPending && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            <DollarSign size={14} /> تسجيل الدفعة
          </button>
        </div>
      </div>
    </div>
  )
}
