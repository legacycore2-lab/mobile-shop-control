// src/pages/settings/StoreInfoSection.tsx
// بيانات المحل اللي بتظهر للعملاء في صفحة المعرض (واتساب / عنوان / مواعيد)
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useStoreInfo, useUpdateStoreInfo } from '@/hooks/useStoreInfo'
import type { StoreInfo } from '@/types/database'

function Form({ initial }: { initial: StoreInfo }) {
  const [form,  setForm]  = useState<StoreInfo>(initial)
  const [msg,   setMsg]   = useState<{ ok: boolean; text: string } | null>(null)
  const update = useUpdateStoreInfo()

  const set = (k: keyof StoreInfo, v: string | number | boolean) => setForm(f => ({ ...f, [k]: v }))

  async function save() {
    setMsg(null)
    try {
      await update.mutateAsync(form)
      setMsg({ ok: true, text: 'تم الحفظ' })
    } catch (e) {
      setMsg({ ok: false, text: (e as { message?: string }).message ?? 'تعذّر الحفظ' })
    }
  }

  return (
    <div className="space-y-4">
      <Input label="رقم الواتساب" placeholder="01012345678" dir="ltr" value={form.whatsapp} onChange={e => set('whatsapp', e.target.value)} />
      <Input label="رقم الهاتف" placeholder="01012345678" dir="ltr" value={form.phone} onChange={e => set('phone', e.target.value)} />
      <Input label="العنوان" value={form.address} onChange={e => set('address', e.target.value)} />
      <Input label="مواعيد العمل" placeholder="يوميًا من 10 ص إلى 10 م" value={form.working_hours} onChange={e => set('working_hours', e.target.value)} />
      <Input label="رابط الموقع على الخريطة" placeholder="https://maps.google.com/..." dir="ltr" value={form.map_url} onChange={e => set('map_url', e.target.value)} />
      <div className="border-t border-gray-100 dark:border-gray-800 pt-4 space-y-4">
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">طرق الدفع (بتظهر للعملاء في الكتالوج)</p>
        {([
          ['pay_cash', 'كاش عند الاستلام'],
          ['pay_vodafone_cash', 'محافظ إلكترونية'],
          ['pay_instapay', 'إنستا باي'],
        ] as const).map(([k, label]) => (
          <label key={k} className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={form[k]}
              onChange={e => set(k, e.target.checked)}
              className="w-4 h-4 accent-blue-600 cursor-pointer" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
          </label>
        ))}
      </div>
      <div className="border-t border-gray-100 dark:border-gray-800 pt-4 space-y-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" checked={form.installment_enabled}
            onChange={e => set('installment_enabled', e.target.checked)}
            className="w-4 h-4 accent-blue-600 cursor-pointer" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">إظهار حاسبة التقسيط للموبايلات في الكتالوج</span>
        </label>
        {form.installment_enabled && (
          <div className="grid grid-cols-2 gap-4">
            <Input label="الفائدة السنوية %" type="number" min="0" max="100" step="0.1" dir="ltr"
              value={String(form.installment_interest_percent)}
              onChange={e => set('installment_interest_percent', e.target.value)} />
            <Input label="المقدم %" type="number" min="0" max="90" step="1" dir="ltr"
              value={String(form.installment_down_percent)}
              onChange={e => set('installment_down_percent', e.target.value)} />
          </div>
        )}
      </div>
      <div className="flex items-center gap-3">
        <Button onClick={() => void save()} loading={update.isPending}>حفظ</Button>
        {msg && <span className={`text-sm ${msg.ok ? 'text-green-600' : 'text-red-600'}`}>{msg.text}</span>}
      </div>
    </div>
  )
}

export function StoreInfoSection() {
  const { data, isLoading, isError } = useStoreInfo()
  if (isLoading) return <p className="text-sm text-gray-500">جاري التحميل...</p>
  if (isError || !data) return <p className="text-sm text-red-600">تعذّر تحميل بيانات المحل</p>
  return <Form initial={data} />
}
