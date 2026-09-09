// src/pages/attendance/ManualAttendanceModal.tsx
import { useState } from 'react'
import { X, ClipboardList, AlertCircle, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useSaveManualAttendance } from '@/hooks/useAttendance'
import type { Employee, AttendanceRecordView, AttendanceStatus } from '@/types/database'

interface Props {
  employee:  Employee
  date:      string
  existing?: AttendanceRecordView | null
  onClose:   () => void
}

const STATUS_OPTIONS: { value: AttendanceStatus; label: string; style: string }[] = [
  { value: 'present',  label: 'حضور',   style: 'border-green-300  bg-green-50  text-green-700  dark:bg-green-900/20  dark:text-green-400  dark:border-green-700'  },
  { value: 'late',     label: 'متأخر',  style: 'border-amber-300  bg-amber-50  text-amber-700  dark:bg-amber-900/20  dark:text-amber-400  dark:border-amber-700'  },
  { value: 'absent',   label: 'غياب',   style: 'border-red-300    bg-red-50    text-red-700    dark:bg-red-900/20    dark:text-red-400    dark:border-red-700'    },
  { value: 'half_day', label: 'نص يوم', style: 'border-blue-300   bg-blue-50   text-blue-700   dark:bg-blue-900/20   dark:text-blue-400   dark:border-blue-700'   },
  { value: 'holiday',  label: 'إجازة',  style: 'border-purple-300 bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-700' },
]

export function ManualAttendanceModal({ employee, date, existing, onClose }: Props) {
  const [status,   setStatus]   = useState<AttendanceStatus>(existing?.status ?? 'present')
  const [checkIn,  setCheckIn]  = useState(
    existing?.check_in_at ? new Date(existing.check_in_at).toTimeString().slice(0, 5) : '09:00'
  )
  const [checkOut, setCheckOut] = useState(
    existing?.check_out_at ? new Date(existing.check_out_at).toTimeString().slice(0, 5) : '17:00'
  )
  const [notes,   setNotes]     = useState(existing?.notes ?? '')
  const [error,   setError]     = useState('')
  const [saving,  setSaving]    = useState(false)

  const save = useSaveManualAttendance()

  const inp = 'h-10 w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all'
  const lbl = 'text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 block'

  const toDatetime = (time: string) => time ? `${date}T${time}:00` : null
  const showTimes  = status !== 'absent' && status !== 'holiday'

  async function handleSave() {
    setError('')
    setSaving(true)
    try {
      await save.mutateAsync({
        employeeId: employee.id,
        recordDate: date,
        status,
        checkInAt:  showTimes ? toDatetime(checkIn)  : null,
        checkOutAt: showTimes ? toDatetime(checkOut) : null,
        notes:      notes || null,
      })
      onClose()
    } catch (e) { setError(e instanceof Error ? e.message : 'حدث خطأ') }
    finally { setSaving(false) }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm shadow-2xl flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
              <ClipboardList size={15} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-white">تسجيل يدوي</p>
              <p className="text-xs text-gray-400">{employee.name} — {date}</p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">

          {/* Status buttons */}
          <div>
            <label className={lbl}>الحالة</label>
            <div className="grid grid-cols-3 gap-2">
              {STATUS_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setStatus(opt.value)}
                  className={cn(
                    'py-2 px-1 rounded-xl border text-xs font-semibold transition-all',
                    status === opt.value
                      ? opt.style + ' border-2 shadow-sm'
                      : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Times */}
          {showTimes && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>وقت الحضور</label>
                <input type="time" value={checkIn} onChange={e => setCheckIn(e.target.value)} className={inp} />
              </div>
              <div>
                <label className={lbl}>وقت الانصراف</label>
                <input type="time" value={checkOut} onChange={e => setCheckOut(e.target.value)} className={inp} />
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className={lbl}>ملاحظات</label>
            <input value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="اختياري..." className={inp} />
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-3 py-2.5 text-sm text-red-700 dark:text-red-400">
              <AlertCircle size={14} /> {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 pt-0 border-t border-gray-100 dark:border-gray-800">
          <button onClick={() => void handleSave()} disabled={saving}
            className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mt-4">
            {saving && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            <CheckCircle size={15} />
            حفظ
          </button>
        </div>
      </div>
    </div>
  )
}
