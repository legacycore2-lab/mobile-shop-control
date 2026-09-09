// src/pages/attendance/AttendancePage.tsx

import { useState } from 'react'
import {
  Users, UserPlus, Calendar, ChevronLeft, ChevronRight,
  MapPin, Clock, ClipboardList, TrendingUp, Edit2, Trash2,
  CheckCircle, XCircle, AlertCircle, Coffee, Umbrella
} from 'lucide-react'
import { Button }   from '@/components/ui/Button'
import { Badge }    from '@/components/ui/Badge'
import { Input }    from '@/components/ui/Input'
import { StatCard } from '@/components/shared/StatCard'
import {
  useEmployees, useDailyAttendance, useMonthlySummary,
  useCheckInGps, useCheckOutGps, useDeactivateEmployee
} from '@/hooks/useAttendance'
import { EmployeeModal }         from './EmployeeModal'
import { ManualAttendanceModal } from './ManualAttendanceModal'
import type { Employee, AttendanceRecordView, AttendanceStatus } from '@/types/database'

// ── Helpers ───────────────────────────────────────────────────────────────────

const today = () => new Date().toISOString().slice(0, 10)
const thisMonth = () => new Date().toISOString().slice(0, 7)

function fmtTime(dt: string | null) {
  if (!dt) return '—'
  return new Date(dt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
}

function fmtHours(h: number | null) {
  if (h == null) return '—'
  const hr = Math.floor(h)
  const mn = Math.round((h - hr) * 60)
  return `${hr}س ${mn}د`
}

const STATUS_META: Record<AttendanceStatus, { label: string; icon: React.ReactNode; variant: string }> = {
  present:  { label: 'حضور',   icon: <CheckCircle size={14} />, variant: 'success' },
  late:     { label: 'متأخر',  icon: <AlertCircle size={14} />, variant: 'warning' },
  absent:   { label: 'غياب',   icon: <XCircle     size={14} />, variant: 'danger'  },
  half_day: { label: 'نص يوم', icon: <Coffee      size={14} />, variant: 'info'    },
  holiday:  { label: 'إجازة',  icon: <Umbrella    size={14} />, variant: 'default' },
}

type Tab = 'daily' | 'employees' | 'summary'

// ── Main Page ─────────────────────────────────────────────────────────────────

export function AttendancePage() {
  const [tab,          setTab]          = useState<Tab>('daily')
  const [selectedDate, setSelectedDate] = useState(today())
  const [selectedMonth,setSelectedMonth]= useState(thisMonth())
  const [empModal,     setEmpModal]     = useState<Employee | null | 'new'>(null)
  const [manualEntry,  setManualEntry]  = useState<{ emp: Employee; rec?: AttendanceRecordView } | null>(null)
  const [gpsMsg,       setGpsMsg]       = useState<string | null>(null)

  const { data: employees = []  } = useEmployees()
  const { data: daily     = [], isLoading: loadingDaily } = useDailyAttendance(selectedDate)
  const { data: summary   = [], isLoading: loadingSummary } = useMonthlySummary(selectedMonth)

  const checkIn  = useCheckInGps()
  const checkOut = useCheckOutGps()
  const deactivate = useDeactivateEmployee()

  // إحصائيات اليومية
  const presentCount = daily.filter(r => r.status === 'present' || r.status === 'late').length
  const absentCount  = daily.filter(r => r.status === 'absent').length
  const lateCount    = daily.filter(r => r.status === 'late').length

  const handleGps = async (empId: string, type: 'check_in' | 'check_out') => {
    setGpsMsg(null)
    try {
      const mut = type === 'check_in' ? checkIn : checkOut
      const res = await mut.mutateAsync(empId)
      if (res.success) {
        setGpsMsg(`✅ تم تسجيل ${type === 'check_in' ? 'الحضور' : 'الانصراف'} — المسافة: ${res.distance}م`)
      } else {
        setGpsMsg(`❌ ${res.error ?? 'خطأ'}`)
      }
    } catch (e: unknown) {
      setGpsMsg(`❌ ${e instanceof Error ? e.message : 'خطأ في تحديد الموقع'}`)
    }
    setTimeout(() => setGpsMsg(null), 5000)
  }

  const stepDate = (d: number) => {
    const dt = new Date(selectedDate)
    dt.setDate(dt.getDate() + d)
    setSelectedDate(dt.toISOString().slice(0, 10))
  }

  const stepMonth = (d: number) => {
    const dt = new Date(selectedMonth + '-01')
    dt.setMonth(dt.getMonth() + d)
    setSelectedMonth(dt.toISOString().slice(0, 7))
  }

  // موظفين ليس لهم سجل اليوم
  const recordedIds = new Set(daily.map(r => r.employee_id))
  const activeEmps  = employees.filter(e => e.is_active)
  const missingEmps = activeEmps.filter(e => !recordedIds.has(e.id))

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">الحضور والانصراف</h1>
          <p className="text-sm text-[var(--text-muted)]">{activeEmps.length} موظف نشط</p>
        </div>
        <Button onClick={() => setEmpModal('new')} className="flex items-center gap-2">
          <UserPlus size={16} /> إضافة موظف
        </Button>
      </div>

      {/* GPS message */}
      {gpsMsg && (
        <div className={`rounded-lg px-4 py-3 text-sm font-medium ${
          gpsMsg.startsWith('✅') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {gpsMsg}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-[var(--bg-secondary)] rounded-lg p-1 w-fit">
        {([
          { id: 'daily',     label: 'اليومي',     icon: <Calendar    size={15} /> },
          { id: 'employees', label: 'الموظفين',   icon: <Users       size={15} /> },
          { id: 'summary',   label: 'الملخص الشهري', icon: <TrendingUp size={15} /> },
        ] as { id: Tab; label: string; icon: React.ReactNode }[]).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all
              ${tab === t.id
                ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── DAILY TAB ── */}
      {tab === 'daily' && (
        <div className="space-y-5">
          {/* Date navigator */}
          <div className="flex items-center gap-3">
            <button onClick={() => stepDate(-1)} className="p-2 rounded-lg border border-[var(--border)] hover:bg-[var(--bg-secondary)]">
              <ChevronRight size={18} />
            </button>
            <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-44 text-center" />
            <button onClick={() => stepDate(1)} className="p-2 rounded-lg border border-[var(--border)] hover:bg-[var(--bg-secondary)]">
              <ChevronLeft size={18} />
            </button>
            <button onClick={() => setSelectedDate(today())}
              className="text-xs text-[var(--accent)] hover:underline font-medium">اليوم</button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard title="حضور"     value={presentCount}         icon={CheckCircle} color="green" />
            <StatCard title="غياب"     value={absentCount}          icon={XCircle}     color="red"   />
            <StatCard title="متأخرين"  value={lateCount}            icon={AlertCircle} color="amber" />
            <StatCard title="غير مسجل" value={missingEmps.length}   icon={ClipboardList} color="gray" />
          </div>

          {/* Table */}
          {loadingDaily ? (
            <p className="text-center text-[var(--text-muted)] py-8">جاري التحميل...</p>
          ) : (
            <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-[var(--bg-secondary)] text-[var(--text-secondary)]">
                  <tr>
                    <th className="text-right px-4 py-3 font-medium">الموظف</th>
                    <th className="text-right px-4 py-3 font-medium hidden sm:table-cell">الوظيفة</th>
                    <th className="text-right px-4 py-3 font-medium">الحالة</th>
                    <th className="text-right px-4 py-3 font-medium hidden md:table-cell">حضور</th>
                    <th className="text-right px-4 py-3 font-medium hidden md:table-cell">انصراف</th>
                    <th className="text-right px-4 py-3 font-medium hidden lg:table-cell">ساعات</th>
                    <th className="text-right px-4 py-3 font-medium hidden lg:table-cell">تأخير</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {/* Recorded */}
                  {daily.map(rec => {
                    const emp = employees.find(e => e.id === rec.employee_id)
                    const meta = STATUS_META[rec.status]
                    return (
                      <tr key={rec.id} className="hover:bg-[var(--bg-secondary)] transition-colors">
                        <td className="px-4 py-3 font-medium text-[var(--text-primary)]">{rec.employee_name}</td>
                        <td className="px-4 py-3 text-[var(--text-muted)] hidden sm:table-cell">{rec.job_title ?? '—'}</td>
                        <td className="px-4 py-3">
                          <Badge variant={meta.variant as 'success'|'warning'|'danger'|'info'|'default'}>
                            <span className="flex items-center gap-1">{meta.icon}{meta.label}</span>
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-[var(--text-secondary)] hidden md:table-cell">{fmtTime(rec.check_in_at)}</td>
                        <td className="px-4 py-3 text-[var(--text-secondary)] hidden md:table-cell">{fmtTime(rec.check_out_at)}</td>
                        <td className="px-4 py-3 text-[var(--text-secondary)] hidden lg:table-cell">{fmtHours(rec.work_hours)}</td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          {rec.late_minutes > 0
                            ? <span className="text-amber-600 font-medium">{rec.late_minutes}د</span>
                            : <span className="text-[var(--text-muted)]">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 justify-end">
                            {emp && (
                              <>
                                {!rec.check_in_at && (
                                  <button
                                    onClick={() => handleGps(emp.id, 'check_in')}
                                    className="text-xs px-2 py-1 rounded bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
                                    title="تسجيل حضور GPS"
                                  >
                                    <MapPin size={12} />
                                  </button>
                                )}
                                {rec.check_in_at && !rec.check_out_at && (
                                  <button
                                    onClick={() => handleGps(emp.id, 'check_out')}
                                    className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                                    title="تسجيل انصراف GPS"
                                  >
                                    <Clock size={12} />
                                  </button>
                                )}
                                <button
                                  onClick={() => setManualEntry({ emp, rec })}
                                  className="text-xs px-2 py-1 rounded bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                                >
                                  <Edit2 size={12} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  {/* Missing */}
                  {missingEmps.map(emp => (
                    <tr key={emp.id} className="hover:bg-[var(--bg-secondary)] transition-colors opacity-60">
                      <td className="px-4 py-3 font-medium text-[var(--text-primary)]">{emp.name}</td>
                      <td className="px-4 py-3 text-[var(--text-muted)] hidden sm:table-cell">{emp.job_title ?? '—'}</td>
                      <td className="px-4 py-3">
                        <Badge variant="default"><span className="flex items-center gap-1"><ClipboardList size={12} />غير مسجل</span></Badge>
                      </td>
                      <td colSpan={4} className="hidden md:table-cell" />
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => handleGps(emp.id, 'check_in')}
                            className="text-xs px-2 py-1 rounded bg-green-100 text-green-700 hover:bg-green-200"
                            title="تسجيل حضور GPS"
                          >
                            <MapPin size={12} />
                          </button>
                          <button
                            onClick={() => setManualEntry({ emp })}
                            className="text-xs px-2 py-1 rounded bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                          >
                            <Edit2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {daily.length === 0 && missingEmps.length === 0 && (
                    <tr>
                      <td colSpan={8} className="text-center py-10 text-[var(--text-muted)]">
                        لا يوجد موظفون نشطون
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── EMPLOYEES TAB ── */}
      {tab === 'employees' && (
        <div className="space-y-4">
          <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[var(--bg-secondary)] text-[var(--text-secondary)]">
                <tr>
                  <th className="text-right px-4 py-3 font-medium">الاسم</th>
                  <th className="text-right px-4 py-3 font-medium hidden sm:table-cell">الوظيفة</th>
                  <th className="text-right px-4 py-3 font-medium hidden md:table-cell">الراتب</th>
                  <th className="text-right px-4 py-3 font-medium hidden lg:table-cell">الدوام</th>
                  <th className="text-right px-4 py-3 font-medium">الحالة</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {employees.map(emp => (
                  <tr key={emp.id} className="hover:bg-[var(--bg-secondary)] transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-[var(--text-primary)]">{emp.name}</p>
                        <p className="text-xs text-[var(--text-muted)]">{emp.phone ?? ''}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[var(--text-secondary)] hidden sm:table-cell">{emp.job_title ?? '—'}</td>
                    <td className="px-4 py-3 font-medium text-[var(--text-primary)] hidden md:table-cell">
                      {Number(emp.base_salary).toLocaleString('ar-EG')} ج
                    </td>
                    <td className="px-4 py-3 text-[var(--text-muted)] hidden lg:table-cell">
                      {emp.work_start_time.slice(0,5)} — {emp.work_end_time.slice(0,5)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={emp.is_active ? 'success' : 'danger'}>
                        {emp.is_active ? 'نشط' : 'متوقف'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        <button onClick={() => setEmpModal(emp)}
                          className="p-1.5 rounded hover:bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                          <Edit2 size={15} />
                        </button>
                        {emp.is_active && (
                          <button
                            onClick={() => { if (confirm('تأكيد إيقاف الموظف؟')) deactivate.mutate(emp.id) }}
                            className="p-1.5 rounded hover:bg-red-50 text-[var(--text-muted)] hover:text-red-600 transition-colors">
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {employees.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-[var(--text-muted)]">
                      لا يوجد موظفون — اضغط "إضافة موظف"
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── SUMMARY TAB ── */}
      {tab === 'summary' && (
        <div className="space-y-5">
          {/* Month navigator */}
          <div className="flex items-center gap-3">
            <button onClick={() => stepMonth(-1)} className="p-2 rounded-lg border border-[var(--border)] hover:bg-[var(--bg-secondary)]">
              <ChevronRight size={18} />
            </button>
            <Input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="w-44 text-center" />
            <button onClick={() => stepMonth(1)} className="p-2 rounded-lg border border-[var(--border)] hover:bg-[var(--bg-secondary)]">
              <ChevronLeft size={18} />
            </button>
          </div>

          {loadingSummary ? (
            <p className="text-center text-[var(--text-muted)] py-8">جاري التحميل...</p>
          ) : (
            <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-[var(--bg-secondary)] text-[var(--text-secondary)]">
                  <tr>
                    <th className="text-right px-4 py-3 font-medium">الموظف</th>
                    <th className="text-right px-4 py-3 font-medium">حضور</th>
                    <th className="text-right px-4 py-3 font-medium">غياب</th>
                    <th className="text-right px-4 py-3 font-medium">تأخير</th>
                    <th className="text-right px-4 py-3 font-medium hidden md:table-cell">ساعات</th>
                    <th className="text-right px-4 py-3 font-medium hidden md:table-cell">خصومات</th>
                    <th className="text-right px-4 py-3 font-medium">الراتب الصافي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {summary.map(row => (
                    <tr key={row.employee_id} className="hover:bg-[var(--bg-secondary)] transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-[var(--text-primary)]">{row.employee_name}</p>
                        <p className="text-xs text-[var(--text-muted)]">{row.job_title ?? ''}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-green-600 font-medium">{row.present_days + row.late_days}</span>
                        <span className="text-[var(--text-muted)] text-xs"> يوم</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={row.absent_days > 0 ? 'text-red-600 font-medium' : 'text-[var(--text-muted)]'}>
                          {row.absent_days}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={row.late_days > 0 ? 'text-amber-600 font-medium' : 'text-[var(--text-muted)]'}>
                          {row.late_days} ({row.total_late_minutes}د)
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[var(--text-secondary)] hidden md:table-cell">
                        {Number(row.total_work_hours).toFixed(1)}س
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className={Number(row.total_deductions) > 0 ? 'text-red-600 font-medium' : 'text-[var(--text-muted)]'}>
                          {Number(row.total_deductions).toLocaleString('ar-EG')} ج
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[var(--text-primary)] font-semibold">
                          {Number(row.net_salary).toLocaleString('ar-EG')} ج
                        </span>
                      </td>
                    </tr>
                  ))}
                  {summary.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-[var(--text-muted)]">
                        لا توجد بيانات لهذا الشهر
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {empModal !== null && (
        <EmployeeModal
          employee={empModal === 'new' ? null : empModal}
          onClose={() => setEmpModal(null)}
        />
      )}
      {manualEntry && (
        <ManualAttendanceModal
          employee={manualEntry.emp}
          date={selectedDate}
          existing={manualEntry.rec}
          onClose={() => setManualEntry(null)}
        />
      )}
    </div>
  )
}
