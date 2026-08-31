import { useState } from 'react'
import { Store } from 'lucide-react'
import { signIn } from '@/lib/auth'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export function LoginPage() {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signIn(email, password)
    } catch {
      setError('بيانات الدخول غلط — تأكد من الإيميل وكلمة المرور')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Store size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Mobile Shop</h1>
          <p className="text-gray-500 text-sm mt-1">نظام إدارة محلات الموبايل</p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-5">تسجيل الدخول</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="البريد الإلكتروني"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="name@company.com"
              required
              autoFocus
            />
            <Input
              label="كلمة المرور"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 text-sm text-red-700">
                {error}
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              className="w-full"
            >
              دخول
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Mobile Shop Control System v1.0
        </p>
      </div>
    </div>
  )
}
