// src/pages/attendance/AttendancePage.tsx
import { useState, useMemo } from 'react'
import {
  Plus, Search, X, ChevronLeft, ChevronRight,
  Users, UserCheck, MapPin, Clock, Calendar,
  CheckCircle, XCircle, AlertCircle, Coffee, Umbrella,
  Pencil, ClipboardList, TrendingUp, ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { fmt } from '@/lib/fmt'
import { Badge } from '@/components/ui/Badge'
import {
  useEmployees,
  useDailyAttendance,
  useMonthlySummary,
  useCheckInGps,
  useCheckOutGps,
  useDeactivateEmployee,
} from '@/hooks/useAttendance'
import { EmployeeModal }         from './EmployeeModal'
import { ManualAttendanceModal } from './ManualAttendanceModal'
import type { Employee, AttendanceRecordView, AttendanceStatus } from '@/types/database'

// ── helpers ───────────────────────────────────────────────────────────────────

const todayStr  = () => new Date().toISOString().slice(0, 10)
const monthStr  = () => new Date().toISOString().slice(0, 7)

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

type StatusMeta = { label: string; variant: 'success'|'warning'|'danger'|'info'|'neutral'; icon: React.ReactNode }

const STATUS_META: Record<AttendanceStatus, StatusMeta> = {
  present:  { label: 'حضور',    variant: 'success',  icon: <CheckCircle size={12} /> },
  late:     { label: 'متأخر',   variant: 'warning',  icon: <AlertCircle size={12} /> },
  absent:   { label: 'غياب',    variant: 'danger',   icon: <XCircle     size={12} /> },
  half_day: { label: 'نص يوم',  variant: 'info',     icon: <Coffee      size={12} /> },
  holiday:  { label: 'إجازة',   variant: 'neutral',  icon: <Umbrella    size={12} /> },
}

type Tab = 'daily' | 'employees' | 'summary'

// ── Employee Form Modal ───────────────────────────────────────────────────────

export { EmployeeModal }

// ── Manual Attendance Modal ───────────────────────────────────────────────────

export { ManualAttendanceModal }

// ── Main Page ─────────────────────────────────────────────────────────────────

export function AttendancePage() {
  const [tab,           setTab]           = useState<Tab>('daily')
  const [selectedDate,  setSelectedDate]  = useState(todayStr())
  const [selectedMonth, setSelectedMonth] = useState(monthStr())
  const [search,        setSearch]        = useState('')
  const [empModal,      setEmpModal]      = useState<Employee | null | 'new'>(null)
  const [manualEntry,   setManualEntry]   = useState<{ emp: Employee; rec?: AttendanceRecordView } | null>(null)
  const [gpsMsg,        setGpsMsg]        = useState<{ ok: boolean; text: string } | null>(null)

  const { data: employees = [] }                           = useEmployees()
  const { data: daily = [],    isLoading: loadingDaily }   = useDailyAttendance(selectedDate)
  const { data: summary = [],  isLoading: loadingSummary } = useMonthlySummary(selectedMonth)

  const checkIn    = useCheckInGps()
  const checkOut   = useCheckOutGps()
  const deactivate = useDeactivateEmployee()

  // ── computed ─────────────────────────────────────────────────
  const activeEmps  = employees.filter(e => e.is_active)
  const recordedIds = new Set(daily.map(r => r.employee_id))
  const missingEmps = activeEmps.filter(e => !recordedIds.has(e.id))

  const presentCount = daily.filter(r => r.status === 'present' || r.status === 'late').length
  const absentCount  = daily.filter(r => r.status === 'absent').length
  const lateCount    = daily.filter(r => r.status === 'late').length

  const filteredEmployees = useMemo(() =>
    employees.filter(e =>
      !search ||
      e.name.includes(search) ||
      (e.job_title ?? '').includes(search) ||
      (e.phone ?? '').includes(search)
    ), [employees, search])

  // ── GPS ──────────────────────────────────────────────────────
  const handleGps = async (empId: string, type: 'check_in' | 'check_out') => {
    setGpsMsg(null)
    try {
      const res = await (type === 'check_in' ? checkIn : checkOut).mutateAsync(empId)
      if (res.success) {
        setGpsMsg({ ok: true, text: `تم تسجيل ${type === 'check_in' ? 'الحضور' : 'الانصراف'} — المسافة ${res.distance}م` })
      } else {
        setGpsMsg({ ok: false, text: res.error ?? 'خطأ غير معروف' })
      }
    } catch (e: unknown) {
      setGpsMsg({ ok: false, text: e instanceof Error ? e.message : 'تعذر تحديد الموقع' })
    }
    setTimeout(() => setGpsMsg(null), 5000)
  }

  const stepDate = (d: number) => {
    const dt = new Date(selectedDate); dt.setDate(dt.getDate() + d)
    setSelectedDate(dt.toISOString().slice(0, 10))
  }
  const stepMonth = (d: number) => {
    const dt = new Date(selectedMonth + '-01'); dt.setMonth(dt.getMonth() + d)
    setSelectedMonth(dt.toISOString().slice(0, 7))
  }

  // ── shared styles ────────────────────────────────────────────
  const inp = 'h-9 w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all'

  return (
    <div className="max-w-7xl mx-auto space-y-6">

      {/* ── Page Header ───────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">الحضور والانصراف</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {activeEmps.length} موظف نشط
          </p>
        </div>
        <button
          onClick={() => setEmpModal('new')}
          className="h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold flex items-center gap-2 transition-colors shadow-lg shadow-blue-600/20"
        >
          <Plus size={16} /> إضافة موظف
        </button>
      </div>

      {/* ── GPS Message ───────────────────────────────────────── */}
      {gpsMsg && (
        <div className={cn(
          'flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium',
          gpsMsg.ok
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400'
            : 'bg-red-50   dark:bg-red-900/20   border-red-200   dark:border-red-800   text-red-700   dark:text-red-400'
        )}>
          {gpsMsg.ok ? <CheckCircle size={15} /> : <XCircle size={15} />}
          {gpsMsg.text}
        </div>
      )}

      {/* ── KPI Cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'إجمالي الموظفين', value: activeEmps.length,  icon: Users,         color: 'blue'  },
          { label: 'حضور اليوم',      value: presentCount,        icon: CheckCircle,   color: 'green' },
          { label: 'غياب اليوم',      value: absentCount,         icon: XCircle,       color: 'red'   },
          { label: 'متأخرين',         value: lateCount,           icon: AlertCircle,   color: 'amber' },
        ].map(({ label, value, icon: Icon, color }) => {
          const colors = {
            blue:  { bg: 'bg-blue-50   dark:bg-blue-900/20',   icon: 'text-blue-500',   border: 'border-blue-100   dark:border-blue-900'   },
            green: { bg: 'bg-green-50  dark:bg-green-900/20',  icon: 'text-green-500',  border: 'border-green-100  dark:border-green-900'  },
            red:   { bg: 'bg-red-50    dark:bg-red-900/20',    icon: 'text-red-500',    border: 'border-red-100    dark:border-red-900'    },
            amber: { bg: 'bg-amber-50  dark:bg-amber-900/20',  icon: 'text-amber-500',  border: 'border-amber-100  dark:border-amber-900'  },
          }[color]!
          return (
            <div key={label} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{label}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
                </div>
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border', colors.bg, colors.border)}>
                  <Icon size={18} className={colors.icon} />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Tabs ──────────────────────────────────────────────── */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 w-fit">
        {([
          { id: 'daily',     label: 'اليومي',         icon: Calendar    },
          { id: 'employees', label: 'الموظفين',        icon: Users       },
          { id: 'summary',   label: 'الملخص الشهري',  icon: TrendingUp  },
        ] as { id: Tab; label: string; icon: React.ElementType }[]).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              tab === t.id
                ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            )}
          >
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════════ */}
      {/* TAB: DAILY                                             */}
      {/* ════════════════════════════════════════════════════════ */}
      {tab === 'daily' && (
        <div className="space-y-4">

          {/* Date navigator */}
          <div className="flex items-center gap-2">
            <button onClick={() => stepDate(-1)}
              className="w-9 h-9 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <ChevronRight size={16} />
            </button>
            <input
              type="date" value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="h-9 border border-gray-200 dark:border-gray-700 rounded-xl px-3 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 transition-all"
            />
            <button onClick={() => stepDate(1)}
              className="w-9 h-9 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <ChevronLeft size={16} />
            </button>
            <button onClick={() => setSelectedDate(todayStr())}
              className="h-9 px-3 rounded-xl border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 text-xs font-semibold hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
              اليوم
            </button>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                    {['الموظف', 'الحالة', 'حضور', 'انصراف', 'ساعات', 'تأخير', ''].map(h => (
                      <th key={h} className="px-4 py-3 text-right text-xs font-bold text-gray-500 dark:text-gray-400 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {loadingDaily ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 7 }).map((_, j) => (
                          <td key={j} className="px-4 py-3">
                            <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : (
                    <>
                      {/* Recorded */}
                      {daily.map(rec => {
                        const emp  = employees.find(e => e.id === rec.employee_id)
                        const meta = STATUS_META[rec.status]
                        return (
                          <tr key={rec.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                            <td className="px-4 py-3">
                              <div>
                                <p className="font-semibold text-gray-900 dark:text-white">{rec.employee_name}</p>
                                {rec.job_title && <p className="text-xs text-gray-400">{rec.job_title}</p>}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant={meta.variant}>
                                <span className="flex items-center gap-1">{meta.icon}{meta.label}</span>
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{fmtTime(rec.check_in_at)}</td>
                            <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{fmtTime(rec.check_out_at)}</td>
                            <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">{fmtHours(rec.work_hours)}</td>
                            <td className="px-4 py-3">
                              {rec.late_minutes > 0
                                ? <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">{rec.late_minutes}د</span>
                                : <span className="text-xs text-gray-300 dark:text-gray-600">—</span>}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1 justify-end">
                                {emp && !rec.check_in_at && (
                                  <button
                                    onClick={() => void handleGps(emp.id, 'check_in')}
                                    title="تسجيل حضور GPS"
                                    className="w-7 h-7 rounded-lg border border-green-200 dark:border-green-800 flex items-center justify-center text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors">
                                    <MapPin size={13} />
                                  </button>
                                )}
                                {emp && rec.check_in_at && !rec.check_out_at && (
                                  <button
                                    onClick={() => void handleGps(emp.id, 'check_out')}
                                    title="تسجيل انصراف GPS"
                                    className="w-7 h-7 rounded-lg border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                                    <Clock size={13} />
                                  </button>
                                )}
                                {emp && (
                                  <button
                                    onClick={() => setManualEntry({ emp, rec })}
                                    className="w-7 h-7 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-400 hover:text-blue-600 hover:border-blue-300 transition-colors">
                                    <Pencil size={13} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })}

                      {/* Missing (not recorded yet) */}
                      {missingEmps.map(emp => (
                        <tr key={emp.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors opacity-60">
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-semibold text-gray-900 dark:text-white">{emp.name}</p>
                              {emp.job_title && <p className="text-xs text-gray-400">{emp.job_title}</p>}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="neutral">
                              <span className="flex items-center gap-1"><ClipboardList size={12} />غير مسجل</span>
                            </Badge>
                          </td>
                          <td colSpan={4} />
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1 justify-end">
                              <button
                                onClick={() => void handleGps(emp.id, 'check_in')}
                                title="تسجيل حضور GPS"
                                className="w-7 h-7 rounded-lg border border-green-200 dark:border-green-800 flex items-center justify-center text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors">
                                <MapPin size={13} />
                              </button>
                              <button
                                onClick={() => setManualEntry({ emp })}
                                className="w-7 h-7 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-400 hover:text-blue-600 hover:border-blue-300 transition-colors">
                                <Pencil size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}

                      {daily.length === 0 && missingEmps.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-4 py-12 text-center">
                            <div className="flex flex-col items-center gap-2 text-gray-400 dark:text-gray-600">
                              <UserCheck size={32} className="opacity-30" />
                              <p className="text-sm font-medium">لا يوجد موظفون نشطون</p>
                              <button onClick={() => setEmpModal('new')}
                                className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline">
                                إضافة أول موظف
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════ */}
      {/* TAB: EMPLOYEES                                         */}
      {/* ════════════════════════════════════════════════════════ */}
      {tab === 'employees' && (
        <div className="space-y-4">

          {/* Search */}
          <div className="relative max-w-xs">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="بحث بالاسم أو الوظيفة..."
              className={cn(inp, 'pr-9')}
            />
            {search && (
              <button onClick={() => setSearch('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={12} />
              </button>
            )}
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                    {['الموظف', 'الوظيفة', 'وقت الدوام', 'الراتب', 'الحالة', ''].map(h => (
                      <th key={h} className="px-4 py-3 text-right text-xs font-bold text-gray-500 dark:text-gray-400 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {filteredEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center">
                        <div className="flex flex-col items-center gap-2 text-gray-400 dark:text-gray-600">
                          <Users size={32} className="opacity-30" />
                          <p className="text-sm font-medium">لا يوجد موظفون</p>
                          <button onClick={() => setEmpModal('new')}
                            className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline">
                            إضافة أول موظف
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : filteredEmployees.map(emp => (
                    <tr key={emp.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">{emp.name}</p>
                          <p className="text-xs text-gray-400">{emp.phone ?? ''}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{emp.job_title ?? '—'}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {emp.work_start_time.slice(0,5)} — {emp.work_end_time.slice(0,5)}
                      </td>
                      <td className="px-4 py-3 font-bold text-gray-900 dark:text-white whitespace-nowrap">
                        {fmt(Number(emp.base_salary))} ج
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={emp.is_active ? 'success' : 'danger'}>
                          {emp.is_active ? 'نشط' : 'متوقف'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <button onClick={() => setEmpModal(emp)}
                            className="w-7 h-7 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-400 hover:text-blue-600 hover:border-blue-300 transition-colors">
                            <Pencil size={13} />
                          </button>
                          {emp.is_active && (
                            <button
                              onClick={() => { if (confirm(`إيقاف ${emp.name}؟`)) deactivate.mutate(emp.id) }}
                              className="w-7 h-7 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-400 hover:text-red-600 hover:border-red-300 transition-colors">
                              <XCircle size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════ */}
      {/* TAB: MONTHLY SUMMARY                                   */}
      {/* ════════════════════════════════════════════════════════ */}
      {tab === 'summary' && (
        <div className="space-y-4">

          {/* Month navigator */}
          <div className="flex items-center gap-2">
            <button onClick={() => stepMonth(-1)}
              className="w-9 h-9 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <ChevronRight size={16} />
            </button>
            <input
              type="month" value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="h-9 border border-gray-200 dark:border-gray-700 rounded-xl px-3 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 transition-all"
            />
            <button onClick={() => stepMonth(1)}
              className="w-9 h-9 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <ChevronLeft size={16} />
            </button>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                    {['الموظف', 'حضور', 'غياب', 'تأخير', 'ساعات العمل', 'الخصومات', 'الراتب الصافي'].map(h => (
                      <th key={h} className="px-4 py-3 text-right text-xs font-bold text-gray-500 dark:text-gray-400 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {loadingSummary ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 7 }).map((_, j) => (
                          <td key={j} className="px-4 py-3">
                            <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : summary.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center">
                        <div className="flex flex-col items-center gap-2 text-gray-400 dark:text-gray-600">
                          <TrendingUp size={32} className="opacity-30" />
                          <p className="text-sm font-medium">لا توجد بيانات لهذا الشهر</p>
                        </div>
                      </td>
                    </tr>
                  ) : summary.map(row => (
                    <tr key={row.employee_id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">{row.employee_name}</p>
                          {row.job_title && <p className="text-xs text-gray-400">{row.job_title}</p>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-green-600 dark:text-green-400">{Number(row.present_days) + Number(row.late_days)}</span>
                        <span className="text-xs text-gray-400"> يوم</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('font-semibold', Number(row.absent_days) > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-400 dark:text-gray-600')}>
                          {row.absent_days}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('text-xs', Number(row.late_days) > 0 ? 'text-amber-600 dark:text-amber-400 font-semibold' : 'text-gray-400')}>
                          {row.late_days} مرة ({row.total_late_minutes}د)
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                        {Number(row.total_work_hours).toFixed(1)} س
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('font-semibold', Number(row.total_deductions) > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-400 dark:text-gray-600')}>
                          {fmt(Number(row.total_deductions))} ج
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-bold text-gray-900 dark:text-white whitespace-nowrap">
                          {fmt(Number(row.net_salary))} ج
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                {summary.length > 0 && (
                  <tfoot>
                    <tr className="bg-blue-50 dark:bg-blue-900/10 border-t-2 border-blue-200 dark:border-blue-800">
                      <td className="px-4 py-3 text-xs font-bold text-blue-700 dark:text-blue-400">
                        الإجمالي ({summary.length} موظف)
                      </td>
                      <td colSpan={4} />
                      <td className="px-4 py-3 text-sm font-bold text-red-600 dark:text-red-400">
                        {fmt(summary.reduce((s, r) => s + Number(r.total_deductions), 0))} ج
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-gray-900 dark:text-white">
                        {fmt(summary.reduce((s, r) => s + Number(r.net_salary), 0))} ج
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Modals ────────────────────────────────────────────── */}
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
