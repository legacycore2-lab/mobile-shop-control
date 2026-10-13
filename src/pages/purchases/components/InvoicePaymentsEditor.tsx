// src/pages/purchases/components/InvoicePaymentsEditor.tsx
// تعديل / حذف / إضافة دفعات فاتورة الشراء من نفس شاشة التعديل
import { useState } from 'react'
import { Check, Plus, Trash2, X } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { fmt } from '@/lib/fmt'
import { cn } from '@/lib/cn'
import {
  usePaymentsByInvoice, useCreatePayment, useUpdatePayment, useDeletePayment,
} from '@/hooks/usePayments'
import type { Payment } from '@/types/database'

const METHODS: { value: string; label: string }[] = [
  { value: 'cash',          label: 'كاش'   },
  { value: 'bank_transfer', label: 'تحويل' },
  { value: 'check',         label: 'شيك'   },
  { value: 'other',         label: 'أخرى'  },
]

const inputCls = 'h-9 border border-gray-200 dark:border-gray-700 rounded-lg px-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 w-full'

interface RowProps {
  payment:  Payment
  onSave:   (id: string, amount: number, method: string, date: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
  busy:     boolean
}

function PaymentRow({ payment, onSave, onDelete, busy }: RowProps) {
  const [amount, setAmount] = useState(String(payment.amount))
  const [method, setMethod] = useState<string>(payment.payment_method)
  const [date,   setDate]   = useState(payment.payment_date)
  const changed = Number(amount) !== payment.amount || method !== payment.payment_method || date !== payment.payment_date

  return (
    <div className="grid grid-cols-[1fr_auto] sm:grid-cols-[110px_110px_140px_auto] gap-2 items-center">
      <input type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className={inputCls} />
      <select value={method} onChange={e => setMethod(e.target.value)} className={cn(inputCls, 'cursor-pointer')}>
        {METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
      </select>
      <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} />
      <div className="flex gap-1.5">
        <button type="button" disabled={!changed || busy} onClick={() => void onSave(payment.id, Number(amount), method, date)}
          className="h-9 w-9 rounded-lg bg-green-600 hover:bg-green-700 text-white flex items-center justify-center disabled:opacity-30"
          aria-label="حفظ الدفعة"><Check size={15} /></button>
        <button type="button" disabled={busy} onClick={() => void onDelete(payment.id)}
          className="h-9 w-9 rounded-lg border border-red-200 dark:border-red-800 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center disabled:opacity-30"
          aria-label="حذف الدفعة"><Trash2 size={14} /></button>
      </div>
    </div>
  )
}

interface Props {
  invoiceId:     string
  invoiceNumber: string
  supplierId:    string
  paidTotal:     number
}

export function InvoicePaymentsEditor({ invoiceId, invoiceNumber, supplierId, paidTotal }: Props) {
  const { profile } = useAuth()
  const { data: payments = [] } = usePaymentsByInvoice(invoiceId)
  const createPayment = useCreatePayment()
  const updatePayment = useUpdatePayment()
  const deletePayment = useDeletePayment()

  const [adding,    setAdding]    = useState(false)
  const [newAmount, setNewAmount] = useState('')
  const [newMethod, setNewMethod] = useState('cash')
  const [newDate,   setNewDate]   = useState(new Date().toISOString().split('T')[0])
  const [error,     setError]     = useState('')

  const busy = createPayment.isPending || updatePayment.isPending || deletePayment.isPending

  async function run(action: () => Promise<unknown>) {
    setError('')
    try { await action() } catch (e) { setError(e instanceof Error ? e.message : 'حدث خطأ') }
  }

  const save = (id: string, amount: number, method: string, date: string) =>
    run(() => updatePayment.mutateAsync({ id, form: { amount, payment_method: method, payment_date: date, notes: '' } }))

  const remove = (id: string) => run(async () => {
    if (!window.confirm('حذف الدفعة دي؟')) return
    await deletePayment.mutateAsync(id)
  })

  const add = () => run(async () => {
    await createPayment.mutateAsync({
      payment_type:   'purchase',
      invoice_id:     invoiceId,
      invoice_number: invoiceNumber,
      party_type:     'supplier',
      party_id:       supplierId,
      amount:         Number(newAmount),
      payment_method: newMethod,
      payment_date:   newDate,
      notes:          '',
      created_by:     profile?.id ?? '',
    })
    setAdding(false)
    setNewAmount('')
  })

  return (
    <div className="sm:col-span-2 rounded-xl border border-gray-200 dark:border-gray-700 p-3 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">الدفعات — إجمالي المدفوع {fmt(paidTotal)} ج</p>
        {!adding && (
          <button type="button" onClick={() => setAdding(true)}
            className="h-8 px-3 rounded-lg border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 text-xs font-semibold flex items-center gap-1">
            <Plus size={12} /> دفعة جديدة
          </button>
        )}
      </div>

      {payments.length === 0 && !adding && (
        <p className="text-xs text-gray-400 dark:text-gray-500">مفيش دفعات على الفاتورة دي</p>
      )}

      {payments.map(p => (
        <PaymentRow key={`${p.id}-${p.amount}-${p.payment_date}-${p.payment_method}`}
          payment={p} onSave={save} onDelete={remove} busy={busy} />
      ))}

      {adding && (
        <div className="grid grid-cols-[1fr_auto] sm:grid-cols-[110px_110px_140px_auto] gap-2 items-center">
          <input type="number" min="0" step="0.01" value={newAmount} onChange={e => setNewAmount(e.target.value)}
            placeholder="المبلغ" className={inputCls} />
          <select value={newMethod} onChange={e => setNewMethod(e.target.value)} className={cn(inputCls, 'cursor-pointer')}>
            {METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className={inputCls} />
          <div className="flex gap-1.5">
            <button type="button" disabled={!Number(newAmount) || busy} onClick={() => void add()}
              className="h-9 w-9 rounded-lg bg-green-600 hover:bg-green-700 text-white flex items-center justify-center disabled:opacity-30"
              aria-label="إضافة"><Check size={15} /></button>
            <button type="button" onClick={() => setAdding(false)}
              className="h-9 w-9 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 flex items-center justify-center"
              aria-label="إلغاء"><X size={14} /></button>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      <p className="text-[11px] text-gray-400 dark:text-gray-500">الدفعات بتتحفظ فورًا (مش مرتبطة بزر حفظ التعديلات)</p>
    </div>
  )
}
