// src/pages/purchases/CancelReasonModal.tsx
import { useState } from 'react'
import { XCircle, X } from 'lucide-react'

interface CancelReasonModalProps {
  invoiceNumber: string
  loading:       boolean
  onConfirm:     (reason: string) => void
  onCancel:      () => void
}

export function CancelReasonModal({
  invoiceNumber,
  loading,
  onConfirm,
  onCancel,
}: CancelReasonModalProps) {
  const [reason, setReason] = useState('')

  const PRESETS = [
    'خطأ في إدخال البيانات',
    'إلغاء الطلب من المورد',
    'مرتجع بضاعة',
    'فاتورة مكررة',
    'تغيير الأسعار',
  ]

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
              <XCircle size={16} className="text-red-500" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-white">إلغاء الفاتورة</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 font-mono">{invoiceNumber}</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
            سيتم إلغاء الفاتورة وعكس أثرها على المخزون — الأجهزة ستُشال والمنتجات سيُطرح منها الكمية المضافة.
          </p>

          {/* Preset reasons */}
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest">سبب الإلغاء</p>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map(p => (
                <button
                  key={p}
                  onClick={() => setReason(p)}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                    reason === p
                      ? 'bg-red-600 border-red-600 text-white'
                      : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-red-300 dark:hover:border-red-700'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Free text */}
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="أو اكتب سبباً مخصصاً..."
            rows={3}
            className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 resize-none focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500 transition-colors"
          />
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 h-11 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            تراجع
          </button>
          <button
            onClick={() => onConfirm(reason.trim())}
            disabled={loading || !reason.trim()}
            className="flex-1 h-11 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            تأكيد الإلغاء
          </button>
        </div>
      </div>
    </div>
  )
}
