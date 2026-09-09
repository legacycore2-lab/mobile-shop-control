// src/repositories/attendance.repository.ts
// Note: Supabase client cannot auto-infer types for attendance/employee tables
// because they were added after the initial schema. Explicit casts are used below.

import { supabase } from '@/lib/supabase'
import type {
  Employee, AttendanceRecord, AttendanceRecordView,
  AttendanceMonthlySummary, AttendanceSettings, RecordAttendanceResult
} from '@/types/database'

// ── Employees ─────────────────────────────────────────────────────────────────

export async function fetchEmployees(): Promise<Employee[]> {
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .order('name')
  if (error) throw error
  const rows = (data ?? []) as unknown as Employee[]
  return rows.map(e => ({ ...e, base_salary: Number(e.base_salary), late_deduct_pct: Number(e.late_deduct_pct), absent_deduct: Number(e.absent_deduct) }))
}

export async function fetchActiveEmployees(): Promise<Employee[]> {
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('is_active', true)
    .order('name')
  if (error) throw error
  return (data ?? [] as Employee[]).map(r => { const e = r as unknown as Employee; return { ...e, base_salary: Number(e.base_salary), late_deduct_pct: Number(e.late_deduct_pct), absent_deduct: Number(e.absent_deduct) } })
}

export async function insertEmployee(payload: Omit<Employee, 'id' | 'created_at' | 'updated_at'>): Promise<Employee> {
  const { data, error } = await supabase
    .from('employees')
    .insert(payload as never)
    .select()
    .single()
  if (error) throw error
  return data as unknown as Employee
}

export async function updateEmployee(id: string, payload: Partial<Employee>): Promise<Employee> {
  const { data, error } = await supabase
    .from('employees')
    .update(payload as never)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as unknown as Employee
}

export async function deleteEmployee(id: string): Promise<void> {
  const { error } = await supabase
    .from('employees')
    .update({ is_active: false } as never)
    .eq('id', id)
  if (error) throw error
}

// ── Attendance Records ────────────────────────────────────────────────────────

export async function fetchAttendanceByDate(date: string): Promise<AttendanceRecordView[]> {
  const { data, error } = await supabase
    .from('attendance_records')
    .select('*, employee:employees(name, job_title)')
    .eq('record_date', date)
    .order('created_at')
  if (error) throw error
  return ((data ?? []) as unknown as Array<AttendanceRecord & { employee?: { name: string; job_title: string | null } }>).map((r) => ({
    ...r,
    deduction:     Number(r.deduction),
    work_hours:    r.work_hours != null ? Number(r.work_hours) : null,
    overtime_hours: Number(r.overtime_hours),
    employee_name: r.employee?.name ?? '',
    job_title:     r.employee?.job_title ?? null,
  }))
}

export async function fetchAttendanceByMonth(
  employeeId: string | null,
  month: string
): Promise<AttendanceRecordView[]> {
  let q = supabase
    .from('attendance_records')
    .select('*, employee:employees(name, job_title)')
    .gte('record_date', `${month}-01`)
    .lte('record_date', `${month}-31`)
    .order('record_date')

  if (employeeId) q = q.eq('employee_id', employeeId)

  const { data, error } = await q
  if (error) throw error
  return ((data ?? []) as unknown as Array<AttendanceRecord & { employee?: { name: string; job_title: string | null } }>).map((r) => ({
    ...r,
    deduction:     Number(r.deduction),
    work_hours:    r.work_hours != null ? Number(r.work_hours) : null,
    overtime_hours: Number(r.overtime_hours),
    employee_name: r.employee?.name ?? '',
    job_title:     r.employee?.job_title ?? null,
  }))
}

export async function upsertAttendanceRecord(
  payload: Omit<AttendanceRecord, 'id' | 'created_at' | 'updated_at'>
): Promise<AttendanceRecord> {
  const { data, error } = await supabase
    .from('attendance_records')
    .upsert(payload as never, { onConflict: 'employee_id,record_date' })
    .select()
    .single()
  if (error) throw error
  return data as unknown as AttendanceRecord
}

export async function updateAttendanceRecord(id: string, payload: Partial<AttendanceRecord>): Promise<AttendanceRecord> {
  const { data, error } = await supabase
    .from('attendance_records')
    .update(payload as never)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as unknown as AttendanceRecord
}

// ── Monthly Summary ───────────────────────────────────────────────────────────

export async function fetchMonthlySummary(month: string): Promise<AttendanceMonthlySummary[]> {
  const { data, error } = await supabase
    .from('attendance_monthly_summary' as never)
    .select('*')
    .eq('month', month)
    .order('employee_name')
  if (error) throw error
  return ((data ?? []) as unknown as AttendanceMonthlySummary[]).map((r) => ({
    ...r,
    base_salary:          Number(r.base_salary),
    total_work_hours:     Number(r.total_work_hours),
    total_overtime_hours: Number(r.total_overtime_hours),
    total_deductions:     Number(r.total_deductions),
    net_salary:           Number(r.net_salary),
    total_days:           Number(r.total_days),
    present_days:         Number(r.present_days),
    late_days:            Number(r.late_days),
    absent_days:          Number(r.absent_days),
    half_days:            Number(r.half_days),
    total_late_minutes:   Number(r.total_late_minutes),
  }))
}

// ── Settings ──────────────────────────────────────────────────────────────────

export async function fetchAttendanceSettings(): Promise<AttendanceSettings | null> {
  const { data, error } = await supabase
    .from('attendance_settings')
    .select('*')
    .limit(1)
    .single()
  if (error && error.code !== 'PGRST116') throw error
  return (data ?? null) as unknown as AttendanceSettings | null
}

export async function upsertAttendanceSettings(
  payload: Partial<Omit<AttendanceSettings, 'id' | 'updated_at'>>
): Promise<AttendanceSettings> {
  const existing = await fetchAttendanceSettings()
  if (existing) {
    const { data, error } = await supabase
      .from('attendance_settings')
      .update(payload as never)
      .eq('id', existing.id)
      .select()
      .single()
    if (error) throw error
    return data as unknown as AttendanceSettings
  }
  const { data, error } = await supabase
    .from('attendance_settings')
    .insert(payload as never)
    .select()
    .single()
  if (error) throw error
  return data as unknown as AttendanceSettings
}

// ── GPS Check-In / Check-Out via RPC ─────────────────────────────────────────

export async function recordAttendanceGps(
  employeeId: string,
  lat: number,
  lng: number,
  type: 'check_in' | 'check_out'
): Promise<RecordAttendanceResult> {
  const { data, error } = await supabase.rpc('record_attendance' as never, {
    p_employee_id: employeeId,
    p_lat:         lat,
    p_lng:         lng,
    p_type:        type,
  } as never)
  if (error) throw error
  return data as RecordAttendanceResult
}
