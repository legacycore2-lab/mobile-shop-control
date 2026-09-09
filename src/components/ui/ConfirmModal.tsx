// src/components/ui/ConfirmModal.tsx
import { AlertTriangle, X } from 'lucide-react'
import { cn } from '@/lib/cn'

interface ConfirmModalProps {
  title:       string
  message:     string
  confirmText?: string
  cancelText?:  string
  variant?:    'danger' | 'warning'
  onConfirm:   () => void
  onCancel:    () => void
  loading?:    boolean
}

export function ConfirmModal({
  title, message,
  confirmText = 'تأكيد',
  cancelText  = 'إلغاء',
  variant     = 'danger',
  onConfirm, onCancel, loading,
}: ConfirmModalProps) {
  const isDanger  = variant === 'danger'
  const iconColor = isDanger ? 'text-red-500' : 'text-amber-500'
  const iconBg    = isDanger ? 'bg-red-50 dark:bg-red-900/20' : 'bg-amber-50 dark:bg-amber-900/20'
  const btnColor  = isDanger
    ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
    : 'bg-amber-500 hover:bg-amber-600 focus:ring-amber-400'

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center', iconBg)}>
              <AlertTriangle size={16} className={iconColor} />
            </div>
            <p className="text-sm font-bold text-gray-900 dark:text-white">{title}</p>
          </div>
          <button
            onClick={onCancel}
            className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5">
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-line">
            {message}
          </p>
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 h-11 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={cn(
              'flex-1 h-11 rounded-xl text-white text-sm font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 flex items-center justify-center gap-2',
              btnColor,
            )}
          >
            {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
