// src/pages/payments/EditPaymentModal.tsx
import { useState } from 'react'
import { X, DollarSign, AlertCircle, Pencil } from 'lucide-react'
import { useUpdatePayment } from '@/hooks/usePayments'
import { PasswordConfirmModal } from '@/components/ui/PasswordConfirmModal'
import { fmt } from '@/lib/fmt'

const METHODS = [
  { value: 'cash',          label: 'نقدي'       },
  { value: 'bank_transfer', label: 'تحويل بنكي' },
  { value: 'check',         label: 'شيك'         },
  { value: 'other',         label: 'أخرى'        },
]

interface EditPaymentModalProps {
  paymentId:     string
  invoiceNumber: string
  currentAmount: number
  currentMethod: string
  currentDate:   string
  currentNotes:  string | null
  onClose:       () => void
}

export function EditPaymentModal({
  paymentId,
  invoiceNumber,
  currentAmount,
  currentMethod,
  currentDate,
  currentNotes,
  onClose,
}: EditPaymentModalProps) {
  const updatePayment = useUpdatePayment()

  const [unlocked,      setUnlocked]      = useState(false)
  const [showPwdModal,  setShowPwdModal]  = useState(false)
  const [amount,        setAmount]        = useState(String(currentAmount))
  const [method,        setMethod]        = useState(currentMethod || 'cash')
  const [paymentDate,   setPaymentDate]   = useState(currentDate)
  const [notes,         setNotes]         = useState(currentNotes ?? '')
  const [error,         setError]         = useState('')

  const inp = 'h-10 border border-gray-200 dark:border-gray-700 rounded-lg px-3 text-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all w-full'
  const inpLocked = 'h-10 border border-gray-200 dark:border-gray-700 rounded-lg px-3 text-sm bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed select-none flex items-center w-full'

  async function handleSave() {
    setError('')
    const amt = Number(amount)
    if (!amt || amt <= 0) return setError('أدخل مبلغ صحيح أكبر من صفر')
    try {
      await updatePayment.mutateAsync({
        id: paymentId,
        form: {
          amount:         amt,
          payment_method: method,
          payment_date:   paymentDate,
          notes:          notes,
        },
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء الحفظ')
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4"
        onClick={e => { if (e.target === e.currentTarget) onClose() }}
      >
        <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md shadow-2xl">

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                <Pencil size={15} className="text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900 dark:text-white">تعديل دفعة</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">{invoiceNumber}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          <div className="px-6 py-5 space-y-4">

            {/* Lock notice */}
            {!unlocked && (
              <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg px-4 py-3 flex items-center justify-between gap-3">
                <p className="text-xs text-orange-700 dark:text-orange-400 font-medium">
                  تعديل الدفعة يتطلب صلاحية المدير
                </p>
                <button
                  onClick={() => setShowPwdModal(true)}
                  className="h-8 px-3 text-xs font-semibold rounded-lg bg-orange-600 hover:bg-orange-700 text-white transition-colors whitespace-nowrap flex-shrink-0"
                >
                  فتح القفل
                </button>
              </div>
            )}

            {/* Amount */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                المبلغ (ج.م) <span className="text-red-500">*</span>
              </label>
              {unlocked ? (
                <input
                  type="number" min="0.01" step="0.01"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className={inp + ' border-orange-300 focus:border-orange-500 focus:ring-orange-500/10'}
                  autoFocus
                />
              ) : (
                <div className={inpLocked}>
                  <span>{fmt(currentAmount)} ج</span>
                  <span className="text-xs mr-auto">مقفول</span>
                </div>
              )}
            </div>

            {/* Method + Date */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">طريقة الدفع</label>
                {unlocked ? (
                  <select value={method} onChange={e => setMethod(e.target.value)} className={inp + ' cursor-pointer'}>
                    {METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                ) : (
                  <div className={inpLocked}>
                    <span>{METHODS.find(m => m.value === currentMethod)?.label ?? currentMethod}</span>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">تاريخ الدفع</label>
                {unlocked ? (
                  <input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} className={inp} />
                ) : (
                  <div className={inpLocked}>
                    <span>{new Date(currentDate).toLocaleDateString('ar-EG')}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">ملاحظات</label>
              {unlocked ? (
                <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="اختياري..." className={inp} />
              ) : (
                <div className={inpLocked}>
                  <span>{currentNotes ?? '—'}</span>
                </div>
              )}
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-2.5 text-sm text-red-700 dark:text-red-400 flex items-center gap-2">
                <AlertCircle size={14} /> {error}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex gap-3 px-6 pb-5">
            <button
              onClick={onClose}
              className="flex-1 h-10 text-sm font-medium rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              إلغاء
            </button>
            <button
              onClick={() => void handleSave()}
              disabled={!unlocked || updatePayment.isPending}
              className="flex-1 h-10 text-sm font-semibold rounded-lg bg-orange-600 hover:bg-orange-700 text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {updatePayment.isPending && (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              <DollarSign size={14} /> حفظ التعديل
            </button>
          </div>
        </div>
      </div>

      {showPwdModal && (
        <PasswordConfirmModal
          title="تعديل دفعة"
          description="هذه العملية تتطلب صلاحية المدير"
          onConfirm={() => { setUnlocked(true); setShowPwdModal(false) }}
          onClose={() => setShowPwdModal(false)}
        />
      )}
    </>
  )
}
