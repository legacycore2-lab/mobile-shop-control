// src/pages/catalog/CartPanel.tsx
import { useState } from 'react'
import { X, Minus, Plus, Trash2, Send } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { fmt } from '@/lib/fmt'
import { useSubmitCatalogOrder } from '@/hooks/useCatalog'
import type { CartLine } from '@/services/catalog.service'
import type { CatalogOrderResult } from '@/types/database'

interface Props {
  lines:     CartLine[]
  total:     number
  onChange:  (key: string, delta: number) => void
  onRemove:  (key: string) => void
  onClose:   () => void
  onSuccess: (result: CatalogOrderResult) => void
}

export function CartPanel({ lines, total, onChange, onRemove, onClose, onSuccess }: Props) {
  const [name,  setName]  = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const submit = useSubmitCatalogOrder()

  async function handleSubmit() {
    setError('')
    try {
      const result = await submit.mutateAsync({ form: { name, phone, notes }, lines })
      onSuccess(result)
    } catch (e) {
      setError((e as { message?: string }).message ?? 'تعذّر إرسال الطلب')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-stretch sm:justify-start"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full sm:max-w-md bg-white dark:bg-gray-900 shadow-2xl flex flex-col max-h-[92vh] sm:max-h-none sm:h-full rounded-t-2xl sm:rounded-none">

        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="font-bold text-gray-900 dark:text-white">سلة الطلب</h2>
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800">
            <X size={14} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div className="space-y-2">
            {lines.map(l => (
              <div key={l.key} className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800 rounded-xl p-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{l.title}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{fmt(l.unitPrice)} ج</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => onChange(l.key, -1)}
                    className="w-7 h-7 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300">
                    <Minus size={12} />
                  </button>
                  <span className="w-6 text-center text-sm font-bold text-gray-900 dark:text-white">{l.quantity}</span>
                  <button onClick={() => onChange(l.key, 1)} disabled={l.quantity >= l.maxQty}
                    className="w-7 h-7 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 disabled:opacity-40">
                    <Plus size={12} />
                  </button>
                </div>
                <button onClick={() => onRemove(l.key)} className="text-gray-400 hover:text-red-500">
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <Input label="الاسم" required value={name} onChange={e => setName(e.target.value)} placeholder="اسمك" />
            <Input label="رقم الموبايل" required type="tel" inputMode="tel" dir="ltr"
              value={phone} onChange={e => setPhone(e.target.value)} placeholder="01xxxxxxxxx" />
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">ملاحظات (اختياري)</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} maxLength={500}
                className="w-full border rounded-lg text-sm px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>

        <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">الإجمالي</span>
            <span className="text-lg font-bold text-gray-900 dark:text-white">{fmt(total)} ج</span>
          </div>
          <Button variant="primary" size="lg" className="w-full" loading={submit.isPending}
            icon={<Send size={16} />} onClick={() => void handleSubmit()}>
            إرسال الطلب
          </Button>
          <p className="text-xs text-center text-gray-400 dark:text-gray-600">
            الأسعار والتوفر بتتأكد وقت الإرسال، وهنتواصل معاك لتأكيد الطلب
          </p>
        </div>
      </div>
    </div>
  )
}
