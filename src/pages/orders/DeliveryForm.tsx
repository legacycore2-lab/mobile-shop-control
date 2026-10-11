// src/pages/orders/DeliveryForm.tsx
// تسليم الطلب: المبلغ المستلم + خصم اختياري، وبعدها بتتعمل فاتورة بيع مؤكدة
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { fmt } from '@/lib/fmt'
import type { DeliveryInput } from '@/services/catalogOrders.service'

interface Props {
  total:     number
  loading:   boolean
  error:     string
  onSubmit:  (input: Omit<DeliveryInput, 'userId'>) => void
  onCancel:  () => void
}

export function DeliveryForm({ total, loading, error, onSubmit, onCancel }: Props) {
  const [discount, setDiscount] = useState('')
  const [paid,     setPaid]     = useState(String(total))

  const net       = Math.max(0, total - (Number(discount) || 0))
  const remaining = Math.max(0, net - (Number(paid) || 0))

  function changeDiscount(v: string) {
    setDiscount(v)
    setPaid(String(Math.max(0, total - (Number(v) || 0))))
  }

  return (
    <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/60 dark:bg-blue-900/10 p-4 space-y-3">
      <p className="text-sm font-bold text-gray-900 dark:text-white">تسليم الطلب</p>
      <div className="grid grid-cols-2 gap-3">
        <Input label="خصم (ج)" type="number" min="0" dir="ltr" value={discount}
          onChange={e => changeDiscount(e.target.value)} placeholder="0" />
        <Input label="المبلغ المستلم (ج)" type="number" min="0" dir="ltr" value={paid}
          onChange={e => setPaid(e.target.value)} />
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600 dark:text-gray-400">إجمالي الفاتورة</span>
        <span className="font-bold text-gray-900 dark:text-white">{fmt(net)} ج</span>
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600 dark:text-gray-400">المتبقي على العميل</span>
        <span className={remaining > 0 ? 'font-bold text-red-600' : 'font-bold text-green-600'}>{fmt(remaining)} ج</span>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        هيتعمل عميل (لو جديد) وفاتورة بيع مؤكدة، والأجهزة والمخزون هيتحدّثوا أوتوماتيك.
      </p>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <Button className="flex-1" loading={loading}
          onClick={() => onSubmit({ paidAmount: Number(paid) || 0, discount: Number(discount) || 0 })}>
          تأكيد التسليم
        </Button>
        <Button variant="secondary" onClick={onCancel} disabled={loading}>رجوع</Button>
      </div>
    </div>
  )
}
