// src/pages/catalog/TrackOrderModal.tsx
// العميل بيتابع حالة طلبه (رقم الطلب + موبايله) ويقيّم بعد التسليم
import { useState } from 'react'
import { X, Check, Star } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { fmt } from '@/lib/fmt'
import { cn } from '@/lib/cn'
import { useTrackOrder, useSubmitReview } from '@/hooks/useCatalog'
import type { TrackedOrder, CatalogOrderStatus } from '@/types/database'

const STEPS: { status: CatalogOrderStatus; label: string }[] = [
  { status: 'new',       label: 'تم الاستلام' },
  { status: 'confirmed', label: 'تم التأكيد'  },
  { status: 'completed', label: 'تم التسليم'  },
]

function StatusSteps({ status }: { status: CatalogOrderStatus }) {
  if (status === 'cancelled') {
    return <p className="rounded-xl bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm font-semibold text-center py-3">تم إلغاء الطلب</p>
  }
  const current = STEPS.findIndex(s => s.status === status)
  return (
    <div className="flex items-start">
      {STEPS.map((s, i) => (
        <div key={s.status} className="flex-1 flex flex-col items-center gap-1.5 relative">
          {i > 0 && (
            <span className={cn('absolute top-4 right-1/2 w-full h-0.5 -z-0', i <= current ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-gray-700')} />
          )}
          <span className={cn(
            'relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold',
            i <= current ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-gray-700 text-slate-500',
          )}>
            {i <= current ? <Check size={14} /> : i + 1}
          </span>
          <span className={cn('text-xs', i <= current ? 'text-gray-900 dark:text-white font-semibold' : 'text-slate-500')}>{s.label}</span>
        </div>
      ))}
    </div>
  )
}

function ReviewForm({ number, phone, onDone }: { number: string; phone: string; onDone: () => void }) {
  const [rating,  setRating]  = useState(0)
  const [comment, setComment] = useState('')
  const [error,   setError]   = useState('')
  const submit = useSubmitReview()

  async function send() {
    setError('')
    try {
      await submit.mutateAsync({ number, phone, rating, comment })
      onDone()
    } catch (e) {
      setError((e as { message?: string }).message ?? 'تعذّر إرسال التقييم')
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-gray-800 p-4 space-y-3">
      <p className="text-sm font-semibold text-gray-900 dark:text-white">قيّم تجربتك معانا</p>
      <div className="flex gap-1" dir="ltr">
        {[1, 2, 3, 4, 5].map(n => (
          <button key={n} onClick={() => setRating(n)} aria-label={`${n} نجوم`}>
            <Star size={28} className={n <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'} />
          </button>
        ))}
      </div>
      <textarea value={comment} onChange={e => setComment(e.target.value)} rows={2} maxLength={400}
        placeholder="رأيك (اختياري)"
        className="w-full rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white resize-none focus:outline-none focus:border-blue-500" />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <Button className="w-full" onClick={() => void send()} loading={submit.isPending} disabled={rating === 0}>إرسال التقييم</Button>
    </div>
  )
}

export function TrackOrderModal({ initialNumber, onClose }: { initialNumber?: string; onClose: () => void }) {
  const [number,   setNumber]   = useState(initialNumber ?? '')
  const [phone,    setPhone]    = useState('')
  const [order,    setOrder]    = useState<TrackedOrder | null>(null)
  const [error,    setError]    = useState('')
  const [reviewed, setReviewed] = useState(false)
  const track = useTrackOrder()

  async function search() {
    setError('')
    setOrder(null)
    setReviewed(false)
    try {
      setOrder(await track.mutateAsync({ number, phone }))
    } catch (e) {
      setError((e as { message?: string }).message ?? 'تعذّر البحث')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center sm:p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div dir="rtl" className="bg-white dark:bg-gray-900 w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-gray-800">
          <h2 className="font-bold text-gray-900 dark:text-white">تتبّع طلبك</h2>
          <button onClick={onClose} aria-label="إغلاق"
            className="w-8 h-8 rounded-lg border border-slate-200 dark:border-gray-700 flex items-center justify-center text-gray-500">
            <X size={14} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <Input label="رقم الطلب" placeholder="ORD-00001" dir="ltr" value={number} onChange={e => setNumber(e.target.value)} />
          <Input label="رقم موبايلك" placeholder="01012345678" dir="ltr" inputMode="tel" value={phone} onChange={e => setPhone(e.target.value)} />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button className="w-full" onClick={() => void search()} loading={track.isPending}>تتبّع</Button>

          {order && (
            <div className="space-y-4 pt-2">
              <StatusSteps status={order.status} />
              <div className="rounded-2xl border border-slate-200 dark:border-gray-800 divide-y divide-slate-100 dark:divide-gray-800 text-sm">
                {order.items.map((it, i) => (
                  <div key={i} className="flex justify-between px-4 py-2.5">
                    <span className="text-gray-900 dark:text-white">{it.name}</span>
                    <span className="text-slate-500">× {it.quantity}</span>
                  </div>
                ))}
                <div className="flex justify-between px-4 py-2.5 font-bold text-gray-900 dark:text-white">
                  <span>الإجمالي</span><span>{fmt(order.total)} ج</span>
                </div>
              </div>

              {order.status === 'completed' && !order.reviewed && !reviewed && (
                <ReviewForm number={order.order_number} phone={phone} onDone={() => setReviewed(true)} />
              )}
              {reviewed && <p className="text-sm text-center text-emerald-600">شكرًا على تقييمك، هيظهر بعد المراجعة.</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
