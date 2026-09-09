// src/lib/permissions.ts

import type { UserRole } from '@/types/database'

export type Resource =
  | 'dashboard' | 'devices'  | 'pos'      | 'purchases' | 'products'
  | 'suppliers' | 'customers'| 'expenses' | 'attendance'| 'reports'
  | 'ledger'    | 'audit'    | 'import'   | 'settings'  | 'permissions'

export type Action = 'view' | 'create' | 'edit' | 'delete'

export interface RolePermission {
  id:         string
  role:       UserRole
  resource:   Resource
  can_view:   boolean
  can_create: boolean
  can_edit:   boolean
  can_delete: boolean
  updated_at: string
}

export type PermissionMap = Map<Resource, Record<Action, boolean>>
export type FullPermissionMap = Map<UserRole, PermissionMap>

export function can(
  map: PermissionMap | null | undefined,
  action: Action,
  resource: Resource
): boolean {
  if (!map) return false
  return map.get(resource)?.[action] ?? false
}

export const RESOURCES: Resource[] = [
  'dashboard','devices','pos','purchases','products',
  'suppliers','customers','expenses','attendance',
  'reports','ledger','audit','import','settings','permissions',
]

export const ACTIONS: Action[] = ['view','create','edit','delete']

export const RESOURCE_LABELS: Record<Resource, string> = {
  dashboard:   'الرئيسية',
  devices:     'الأجهزة',
  pos:         'نقطة البيع',
  purchases:   'المشتريات',
  products:    'المنتجات',
  suppliers:   'الموردين',
  customers:   'العملاء',
  expenses:    'المصروفات',
  attendance:  'الحضور والانصراف',
  reports:     'التقارير',
  ledger:      'الحسابات',
  audit:       'سجل العمليات',
  import:      'استيراد البيانات',
  settings:    'الإعدادات',
  permissions: 'الصلاحيات',
}

export const ACTION_LABELS: Record<Action, string> = {
  view:   'عرض',
  create: 'إضافة',
  edit:   'تعديل',
  delete: 'حذف',
}

export const ROLE_LABELS: Record<UserRole, string> = {
  owner:     'المالك',
  manager:   'المدير',
  cashier:   'الكاشير',
  warehouse: 'المخزن',
}
