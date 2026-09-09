// src/services/attendance.service.ts

import * as repo from '@/repositories/attendance.repository'
import type {
  Employee, AttendanceRecord, AttendanceRecordView,
  AttendanceMonthlySummary, AttendanceSettings, RecordAttendanceResult,
  AttendanceStatus
} from '@/types/database'

// ── Employees ─────────────────────────────────────────────────────────────────

export const getEmployees       = () => repo.fetchEmployees()
export const getActiveEmployees = () => repo.fetchActiveEmployees()

export const createEmployee = (
  payload: Omit<Employee, 'id' | 'created_at' | 'updated_at'>
) => repo.insertEmployee(payload)

export const editEmployee = (id: string, payload: Partial<Employee>) =>
  repo.updateEmployee(id, payload)

export const deactivateEmployee = (id: string) =>
  repo.deleteEmployee(id)

// ── Attendance Records ────────────────────────────────────────────────────────

export const getDailyAttendance  = (date: string) =>
  repo.fetchAttendanceByDate(date)

export const getMonthlyAttendance = (employeeId: string | null, month: string) =>
  repo.fetchAttendanceByMonth(employeeId, month)

export const getMonthlySummary = (month: string): Promise<AttendanceMonthlySummary[]> =>
  repo.fetchMonthlySummary(month)

export const saveManualAttendance = (
  employeeId: string,
  recordDate: string,
  status: AttendanceStatus,
  checkInAt: string | null,
  checkOutAt: string | null,
  notes: string | null
): Promise<AttendanceRecord> => {
  const lateMinutes = calcLateMinutes(checkInAt, '09:00')
  const workHours   = calcWorkHours(checkInAt, checkOutAt)

  return repo.upsertAttendanceRecord({
    employee_id:      employeeId,
    record_date:      recordDate,
    check_in_at:      checkInAt,
    check_out_at:     checkOutAt,
    check_in_lat:     null,
    check_in_lng:     null,
    check_out_lat:    null,
    check_out_lng:    null,
    check_in_dist_m:  null,
    check_out_dist_m: null,
    is_within_range:  null,
    status,
    late_minutes:     lateMinutes,
    work_hours:       workHours,
    overtime_hours:   0,
    deduction:        0,
    notes,
    created_by:       null,
  })
}

export const editAttendanceRecord = (id: string, payload: Partial<AttendanceRecord>) =>
  repo.updateAttendanceRecord(id, payload)

// ── GPS ───────────────────────────────────────────────────────────────────────

export const checkInWithGps = async (
  employeeId: string
): Promise<RecordAttendanceResult> => {
  const pos = await getCurrentPosition()
  return repo.recordAttendanceGps(employeeId, pos.lat, pos.lng, 'check_in')
}

export const checkOutWithGps = async (
  employeeId: string
): Promise<RecordAttendanceResult> => {
  const pos = await getCurrentPosition()
  return repo.recordAttendanceGps(employeeId, pos.lat, pos.lng, 'check_out')
}

// ── Settings ──────────────────────────────────────────────────────────────────

export const getAttendanceSettings = () => repo.fetchAttendanceSettings()

export const saveAttendanceSettings = (
  payload: Partial<Omit<AttendanceSettings, 'id' | 'updated_at'>>
) => repo.upsertAttendanceSettings(payload)

// ── Helpers ───────────────────────────────────────────────────────────────────

function getCurrentPosition(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('المتصفح لا يدعم تحديد الموقع'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => reject(new Error('تعذر تحديد موقعك، تأكد من تفعيل GPS')),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  })
}

function calcLateMinutes(checkInAt: string | null, startTime: string): number {
  if (!checkInAt) return 0
  const cin   = new Date(checkInAt)
  const [h, m] = startTime.split(':').map(Number)
  const start = new Date(cin)
  start.setHours(h, m, 0, 0)
  const diff = Math.floor((cin.getTime() - start.getTime()) / 60000)
  return Math.max(0, diff)
}

function calcWorkHours(checkInAt: string | null, checkOutAt: string | null): number | null {
  if (!checkInAt || !checkOutAt) return null
  const diff = new Date(checkOutAt).getTime() - new Date(checkInAt).getTime()
  return Math.round((diff / 3600000) * 100) / 100
}
