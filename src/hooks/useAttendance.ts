// src/hooks/useAttendance.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as svc from '@/services/attendance.service'
import type { Employee, AttendanceStatus, AttendanceRecord, AttendanceSettings } from '@/types/database'

const KEYS = {
  employees:       ['employees'] as const,
  activeEmployees: ['employees', 'active'] as const,
  daily:           (date: string) => ['attendance', 'daily', date] as const,
  monthly:         (emp: string | null, month: string) => ['attendance', 'monthly', emp, month] as const,
  summary:         (month: string) => ['attendance', 'summary', month] as const,
  settings:        ['attendance-settings'] as const,
}

// ── Employees ─────────────────────────────────────────────────────────────────

export function useEmployees() {
  return useQuery({ queryKey: KEYS.employees, queryFn: svc.getEmployees })
}

export function useActiveEmployees() {
  return useQuery({ queryKey: KEYS.activeEmployees, queryFn: svc.getActiveEmployees })
}

export function useCreateEmployee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: Omit<Employee, 'id' | 'created_at' | 'updated_at'>) =>
      svc.createEmployee(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.employees }),
  })
}

export function useEditEmployee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Employee> }) =>
      svc.editEmployee(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.employees }),
  })
}

export function useDeactivateEmployee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => svc.deactivateEmployee(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.employees }),
  })
}

// ── Attendance ────────────────────────────────────────────────────────────────

export function useDailyAttendance(date: string) {
  return useQuery({
    queryKey: KEYS.daily(date),
    queryFn:  () => svc.getDailyAttendance(date),
  })
}

export function useMonthlyAttendance(employeeId: string | null, month: string) {
  return useQuery({
    queryKey: KEYS.monthly(employeeId, month),
    queryFn:  () => svc.getMonthlyAttendance(employeeId, month),
  })
}

export function useMonthlySummary(month: string) {
  return useQuery({
    queryKey: KEYS.summary(month),
    queryFn:  () => svc.getMonthlySummary(month),
  })
}

export function useSaveManualAttendance() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (p: {
      employeeId: string
      recordDate: string
      status: AttendanceStatus
      checkInAt: string | null
      checkOutAt: string | null
      notes: string | null
    }) => svc.saveManualAttendance(p.employeeId, p.recordDate, p.status, p.checkInAt, p.checkOutAt, p.notes),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: KEYS.daily(vars.recordDate) })
      qc.invalidateQueries({ queryKey: ['attendance', 'monthly'] })
      qc.invalidateQueries({ queryKey: ['attendance', 'summary'] })
    },
  })
}

export function useEditAttendanceRecord() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<AttendanceRecord> }) =>
      svc.editAttendanceRecord(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance'] })
    },
  })
}

export function useCheckInGps() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (employeeId: string) => svc.checkInWithGps(employeeId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attendance'] }),
  })
}

export function useCheckOutGps() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (employeeId: string) => svc.checkOutWithGps(employeeId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attendance'] }),
  })
}

// ── Settings ──────────────────────────────────────────────────────────────────

export function useAttendanceSettings() {
  return useQuery({ queryKey: KEYS.settings, queryFn: svc.getAttendanceSettings })
}

export function useSaveAttendanceSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: Partial<Omit<AttendanceSettings, 'id' | 'updated_at'>>) =>
      svc.saveAttendanceSettings(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.settings }),
  })
}
