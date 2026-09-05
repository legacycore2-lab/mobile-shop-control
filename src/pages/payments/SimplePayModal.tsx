// src/pages/payments/SimplePayModal.tsx
// Simple 3-field payment modal: amount + method + date
import { useState } from 'react'
import { DollarSign } from 'lucide-react'
import { useCreatePayment } from '@/hooks/usePayments'
import { useAuth } from '@/lib/auth'
import { useQueryClient } from '@tanstack/react-query'
import { fmt } from '@/constants/statusMaps'
import type { PaymentType, PartyType } from '@/types/database'

interface Props {
  invoiceId:     string
  invoiceNumber: string
  partyId:       string
  partyName:     string
  partyType:     PartyType
  paymentType:   PaymentType
  remaining:     number
  onClose:       () => void
}

export function SimplePayModal({
  invoiceId, invoiceNumber, partyId, partyName,
  partyType, paymentType, remaining, onClose,
}: Props) {
  const { profile }   = useAuth()
  const createPayment = useCreatePayment()
  const qc            = useQueryClient()

  const [amount,  setAmount]  = useState(String(Math.abs(remaining) > 0 ? Math.abs(remaining) : ''))
  const [method,  setMethod]  = useState('cash')
  const [date,    setDate]    = useState(new Date().toISOString().split('T')[0])
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')

  const inp = 'h-11 border border-gray-200 dark:border-gray-700 rounded-xl px-3 text-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all w-full'

  async function handlePay() {
    const amt = Number(amount)
    if (!amt || amt <= 0) return setError('أدخل مبلغ صحيح')
    setSaving(true)
    try {
      await createPayment.mutateAsync({
        payment_type:   paymentType,
        invoice_id:     invoiceId,
        invoice_number: invoiceNumber,
        party_type:     partyType,
        party_id:       partyId,
        amount:         amt,
        payment_method: method,
        payment_date:   date,
        notes:          '',
        created_by:     profile?.id ?? '',
      })
      await qc.invalidateQueries({ queryKey: ['purchases'] })
      await qc.invalidateQueries({ queryKey: ['payments'] })
      await qc.invalidateQueries({ queryKey: ['ledger', 'suppliers'] })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-xs shadow-2xl" dir="rtl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <div>
            <p className="text-sm font-bold text-gray-900 dark:text-white">تسجيل دفعة</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              {invoiceNumber} — المتبقي: <span className="font-bold text-red-500">{fmt(Math.abs(remaining))} ج</span>
            </p>
          </div>
          <button onClick={onClose}
            className="w-7 h-7 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-400 hover:text-gray-600 text-lg leading-none">
            ×
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-3">
          {/* Amount */}
          <input
            type="number" min="0.01" step="0.01"
            value={amount} onChange={e => setAmount(e.target.value)}
            placeholder="المبلغ (ج)"
            className={inp + ' text-xl font-bold text-center'}
            autoFocus
          />

          {/* Method */}
          <select value={method} onChange={e => setMethod(e.target.value)} className={inp + ' cursor-pointer'}>
            <option value="cash">نقدي</option>
            <option value="bank_transfer">تحويل بنكي</option>
            <option value="check">شيك</option>
            <option value="other">أخرى</option>
          </select>

          {/* Date */}
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inp} />

          {error && <p className="text-xs text-red-500 text-center">{error}</p>}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5">
          <button onClick={() => void handlePay()} disabled={saving}
            className="w-full h-11 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {saving
              ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <DollarSign size={15} />}
            تسجيل الدفعة
          </button>
        </div>
      </div>
    </div>
  )
}
