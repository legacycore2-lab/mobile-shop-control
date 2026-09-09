// src/pages/attendance/EmployeeModal.tsx

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input }  from '@/components/ui/Input'
import { useCreateEmployee, useEditEmployee } from '@/hooks/useAttendance'
import type { Employee } from '@/types/database'

interface Props {
  employee?: Employee | null
  onClose: () => void
}

const EMPTY = {
  name: '', phone: '', national_id: '', job_title: '',
  base_salary: 0, work_start_time: '09:00', work_end_time: '17:00',
  late_grace_min: 15, late_deduct_pct: 0, absent_deduct: 0,
  is_active: true, notes: '',
}

export function EmployeeModal({ employee, onClose }: Props) {
  const [form, setForm] = useState(EMPTY)
  const create = useCreateEmployee()
  const edit   = useEditEmployee()
  const busy   = create.isPending || edit.isPending

  useEffect(() => {
    if (employee) {
      setForm({
        name:            employee.name,
        phone:           employee.phone ?? '',
        national_id:     employee.national_id ?? '',
        job_title:       employee.job_title ?? '',
        base_salary:     Number(employee.base_salary),
        work_start_time: employee.work_start_time.slice(0,5),
        work_end_time:   employee.work_end_time.slice(0,5),
        late_grace_min:  employee.late_grace_min,
        late_deduct_pct: Number(employee.late_deduct_pct),
        absent_deduct:   Number(employee.absent_deduct),
        is_active:       employee.is_active,
        notes:           employee.notes ?? '',
      })
    }
  }, [employee])

  const set = (k: string, v: string | number | boolean) =>
    setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async () => {
    if (!form.name.trim()) return
    const payload = {
      ...form,
      work_start_time: form.work_start_time + ':00',
      work_end_time:   form.work_end_time   + ':00',
      phone:       form.phone || null,
      national_id: form.national_id || null,
      job_title:   form.job_title || null,
      notes:       form.notes || null,
    }
    if (employee) {
      await edit.mutateAsync({ id: employee.id, payload })
    } else {
      await create.mutateAsync(payload)
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-[var(--bg-card)] rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            {employee ? 'تعديل موظف' : 'إضافة موظف'}
          </h2>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">الاسم *</label>
              <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="اسم الموظف" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">الوظيفة</label>
              <Input value={form.job_title} onChange={e => set('job_title', e.target.value)} placeholder="كاشير / مخزن..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">الموبايل</label>
              <Input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="01xxxxxxxxx" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">الرقم القومي</label>
              <Input value={form.national_id} onChange={e => set('national_id', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">الراتب الأساسي</label>
              <Input type="number" value={form.base_salary} onChange={e => set('base_salary', Number(e.target.value))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">بداية الدوام</label>
              <Input type="time" value={form.work_start_time} onChange={e => set('work_start_time', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">نهاية الدوام</label>
              <Input type="time" value={form.work_end_time} onChange={e => set('work_end_time', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">سماح تأخير (دقيقة)</label>
              <Input type="number" value={form.late_grace_min} onChange={e => set('late_grace_min', Number(e.target.value))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">خصم تأخير %</label>
              <Input type="number" value={form.late_deduct_pct} onChange={e => set('late_deduct_pct', Number(e.target.value))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">خصم غياب (جنيه/يوم)</label>
              <Input type="number" value={form.absent_deduct} onChange={e => set('absent_deduct', Number(e.target.value))} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">ملاحظات</label>
              <Input value={form.notes} onChange={e => set('notes', e.target.value)} />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 p-5 border-t border-[var(--border)]">
          <Button variant="ghost" onClick={onClose} disabled={busy}>إلغاء</Button>
          <Button onClick={handleSubmit} disabled={busy || !form.name.trim()}>
            {busy ? 'جاري الحفظ...' : employee ? 'حفظ التعديلات' : 'إضافة الموظف'}
          </Button>
        </div>
      </div>
    </div>
  )
}
