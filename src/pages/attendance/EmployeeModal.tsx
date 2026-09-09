// src/pages/attendance/EmployeeModal.tsx
import { useState, useEffect } from 'react'
import { X, UserCheck, AlertCircle, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useCreateEmployee, useEditEmployee } from '@/hooks/useAttendance'
import type { Employee } from '@/types/database'

interface Props {
  employee?: Employee | null
  onClose: () => void
}

const EMPTY = {
  name: '', phone: '', national_id: '', job_title: '',
  base_salary: '', work_start_time: '09:00', work_end_time: '17:00',
  late_grace_min: '15', late_deduct_pct: '0', absent_deduct: '0',
  is_active: true, notes: '',
}

export function EmployeeModal({ employee, onClose }: Props) {
  const [form,   setForm]   = useState(EMPTY)
  const [error,  setError]  = useState('')
  const [saving, setSaving] = useState(false)

  const create = useCreateEmployee()
  const edit   = useEditEmployee()

  const inp = 'h-10 w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all'
  const lbl = 'text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 block'

  useEffect(() => {
    if (employee) {
      setForm({
        name:            employee.name,
        phone:           employee.phone ?? '',
        national_id:     employee.national_id ?? '',
        job_title:       employee.job_title ?? '',
        base_salary:     String(employee.base_salary),
        work_start_time: employee.work_start_time.slice(0, 5),
        work_end_time:   employee.work_end_time.slice(0, 5),
        late_grace_min:  String(employee.late_grace_min),
        late_deduct_pct: String(employee.late_deduct_pct),
        absent_deduct:   String(employee.absent_deduct),
        is_active:       employee.is_active,
        notes:           employee.notes ?? '',
      })
    }
  }, [employee])

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  async function handleSave() {
    setError('')
    if (!form.name.trim()) return setError('الاسم مطلوب')
    if (!form.base_salary || Number(form.base_salary) < 0) return setError('الراتب غير صحيح')
    setSaving(true)
    try {
      const payload = {
        name:            form.name.trim(),
        phone:           form.phone || null,
        national_id:     form.national_id || null,
        job_title:       form.job_title || null,
        base_salary:     Number(form.base_salary),
        work_start_time: form.work_start_time + ':00',
        work_end_time:   form.work_end_time   + ':00',
        late_grace_min:  Number(form.late_grace_min),
        late_deduct_pct: Number(form.late_deduct_pct),
        absent_deduct:   Number(form.absent_deduct),
        is_active:       form.is_active,
        notes:           form.notes || null,
      }
      if (employee) {
        await edit.mutateAsync({ id: employee.id, payload })
      } else {
        await create.mutateAsync(payload)
      }
      onClose()
    } catch (e) { setError(e instanceof Error ? e.message : 'حدث خطأ') }
    finally { setSaving(false) }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
              <UserCheck size={15} className="text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-sm font-bold text-gray-900 dark:text-white">
              {employee ? 'تعديل موظف' : 'إضافة موظف'}
            </p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* Name */}
          <div>
            <label className={lbl}>الاسم *</label>
            <input value={form.name} onChange={set('name')} placeholder="اسم الموظف"
              autoFocus className={inp} />
          </div>

          {/* Job + Phone */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>الوظيفة</label>
              <input value={form.job_title} onChange={set('job_title')} placeholder="كاشير / مخزن..." className={inp} />
            </div>
            <div>
              <label className={lbl}>الموبايل</label>
              <input value={form.phone} onChange={set('phone')} placeholder="01xxxxxxxxx" className={inp} />
            </div>
          </div>

          {/* National ID + Salary */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>الرقم القومي</label>
              <input value={form.national_id} onChange={set('national_id')} className={inp} />
            </div>
            <div>
              <label className={lbl}>الراتب الأساسي (ج) *</label>
              <input type="number" min="0" value={form.base_salary} onChange={set('base_salary')}
                placeholder="0.00" className={cn(inp, 'text-lg font-bold')} />
            </div>
          </div>

          {/* Work times */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>بداية الدوام</label>
              <input type="time" value={form.work_start_time} onChange={set('work_start_time')} className={inp} />
            </div>
            <div>
              <label className={lbl}>نهاية الدوام</label>
              <input type="time" value={form.work_end_time} onChange={set('work_end_time')} className={inp} />
            </div>
          </div>

          {/* Deductions */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={lbl}>سماح تأخير (دقيقة)</label>
              <input type="number" min="0" value={form.late_grace_min} onChange={set('late_grace_min')} className={inp} />
            </div>
            <div>
              <label className={lbl}>خصم تأخير %</label>
              <input type="number" min="0" max="100" value={form.late_deduct_pct} onChange={set('late_deduct_pct')} className={inp} />
            </div>
            <div>
              <label className={lbl}>خصم غياب (ج/يوم)</label>
              <input type="number" min="0" value={form.absent_deduct} onChange={set('absent_deduct')} className={inp} />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className={lbl}>ملاحظات</label>
            <input value={form.notes} onChange={set('notes')} placeholder="اختياري..." className={inp} />
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-3 py-2.5 text-sm text-red-700 dark:text-red-400">
              <AlertCircle size={14} /> {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 pt-3 border-t border-gray-100 dark:border-gray-800 flex-shrink-0">
          <button onClick={() => void handleSave()} disabled={saving}
            className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {saving && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            <CheckCircle size={15} />
            {employee ? 'حفظ التعديلات' : 'إضافة الموظف'}
          </button>
        </div>
      </div>
    </div>
  )
}
