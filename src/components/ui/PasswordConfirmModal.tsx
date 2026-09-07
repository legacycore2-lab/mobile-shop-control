// src/components/ui/PasswordConfirmModal.tsx
// Modal يطلب باسورد المدير للتحقق قبل أي عملية حساسة
import { useState } from 'react'
import { Lock, X, Eye, EyeOff } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'

interface Props {
  title?:       string
  description?: string
  onConfirm:    () => void
  onClose:      () => void
}

export function PasswordConfirmModal({ title = 'تأكيد الهوية', description, onConfirm, onClose }: Props) {
  const { session } = useAuth()
  const [password, setPassword] = useState('')
  const [show,     setShow]     = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  async function handleConfirm() {
    if (!password.trim()) return setError('أدخل كلمة المرور')
    const email = session?.user?.email
    if (!email) return setError('لم يتم التعرف على المستخدم')
    setLoading(true)
    setError('')
    try {
      const { error: authErr } = await supabase.auth.signInWithPassword({ email, password })
      if (authErr) { setError('كلمة المرور غير صحيحة'); return }
      onConfirm()
    } catch {
      setError('حدث خطأ، حاول مرة أخرى')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-xs shadow-2xl" dir="rtl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <Lock size={15} className="text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-white">{title}</p>
              {description && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{description}</p>}
            </div>
          </div>
          <button onClick={onClose}
            className="w-7 h-7 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-3">
          <div className="relative">
            <input
              type={show ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && void handleConfirm()}
              placeholder="كلمة مرور المدير"
              autoFocus
              className="w-full h-11 border border-gray-200 dark:border-gray-700 rounded-xl pr-4 pl-10 text-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/10 transition-all"
            />
            <button type="button" onClick={() => setShow(v => !v)}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
              {show ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          {error && <p className="text-xs text-red-500 text-center font-medium">{error}</p>}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 flex gap-2">
          <button onClick={onClose}
            className="flex-1 h-10 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            إلغاء
          </button>
          <button onClick={() => void handleConfirm()} disabled={loading}
            className="flex-1 h-10 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {loading
              ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <Lock size={13} />}
            تأكيد
          </button>
        </div>
      </div>
    </div>
  )
}
