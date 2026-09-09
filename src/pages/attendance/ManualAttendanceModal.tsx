// src/pages/attendance/ManualAttendanceModal.tsx

import { useState } from 'react'
import { X } from 'lucide-react'
import { Button }  from '@/components/ui/Button'
import { Input }   from '@/components/ui/Input'
import { useSaveManualAttendance } from '@/hooks/useAttendance'
import type { Employee, AttendanceRecordView, AttendanceStatus } from '@/types/database'

interface Props {
  employee:   Employee
  date:       string
  existing?:  AttendanceRecordView | null
  onClose:    () => void
}

const STATUS_OPTIONS: { value: AttendanceStatus; label: string; color: string }[] = [
  { value: 'present',  label: 'حضور',     color: 'bg-green-100 text-green-700 border-green-300' },
  { value: 'late',     label: 'متأخر',    color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
  { value: 'absent',   label: 'غياب',     color: 'bg-red-100 text-red-700 border-red-300' },
  { value: 'half_day', label: 'نص يوم',   color: 'bg-blue-100 text-blue-700 border-blue-300' },
  { value: 'holiday',  label: 'إجازة',    color: 'bg-purple-100 text-purple-700 border-purple-300' },
]

export function ManualAttendanceModal({ employee, date, existing, onClose }: Props) {
  const [status,    setStatus]    = useState<AttendanceStatus>(existing?.status ?? 'present')
  const [checkIn,   setCheckIn]   = useState(existing?.check_in_at  ? new Date(existing.check_in_at).toTimeString().slice(0,5)  : '09:00')
  const [checkOut,  setCheckOut]  = useState(existing?.check_out_at ? new Date(existing.check_out_at).toTimeString().slice(0,5) : '17:00')
  const [notes,     setNotes]     = useState(existing?.notes ?? '')
  const save = useSaveManualAttendance()

  const toDatetime = (time: string) =>
    time ? `${date}T${time}:00` : null

  const handleSave = async () => {
    await save.mutateAsync({
      employeeId: employee.id,
      recordDate: date,
      status,
      checkInAt:  status === 'absent' || status === 'holiday' ? null : toDatetime(checkIn),
      checkOutAt: status === 'absent' || status === 'holiday' ? null : toDatetime(checkOut),
      notes:      notes || null,
    })
    onClose()
  }

  const showTimes = status !== 'absent' && status !== 'holiday'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-[var(--bg-card)] rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">تسجيل يدوي</h2>
            <p className="text-sm text-[var(--text-muted)]">{employee.name} — {date}</p>
          </div>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">الحالة</label>
            <div className="grid grid-cols-3 gap-2">
              {STATUS_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setStatus(opt.value)}
                  className={`py-2 px-3 rounded-lg border text-sm font-medium transition-all
                    ${status === opt.value ? opt.color + ' border-2' : 'border-[var(--border)] text-[var(--text-secondary)]'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {showTimes && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">وقت الحضور</label>
                <Input type="time" value={checkIn} onChange={e => setCheckIn(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">وقت الانصراف</label>
                <Input type="time" value={checkOut} onChange={e => setCheckOut(e.target.value)} />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">ملاحظات</label>
            <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="اختياري..." />
          </div>
        </div>

        <div className="flex justify-end gap-3 p-5 border-t border-[var(--border)]">
          <Button variant="ghost" onClick={onClose} disabled={save.isPending}>إلغاء</Button>
          <Button onClick={handleSave} disabled={save.isPending}>
            {save.isPending ? 'جاري الحفظ...' : 'حفظ'}
          </Button>
        </div>
      </div>
    </div>
  )
}
