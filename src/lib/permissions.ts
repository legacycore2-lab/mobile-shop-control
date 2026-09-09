// src/lib/permissions.ts
// !! هذا الملف يُولَّد تلقائياً من صفحة إدارة الصلاحيات — لا تعدله يدوياً !!

import type { UserRole } from '@/types/database'

export type Resource =
  | 'dashboard'
  | 'devices'
  | 'pos'
  | 'purchases'
  | 'products'
  | 'suppliers'
  | 'customers'
  | 'expenses'
  | 'attendance'
  | 'reports'
  | 'ledger'
  | 'audit'
  | 'import'
  | 'settings'
  | 'permissions'

export type Action = 'view' | 'create' | 'edit' | 'delete'

export type PermissionMatrix = Record<UserRole, Record<Resource, Record<Action, boolean>>>

export const PERMISSIONS: PermissionMatrix = {
  owner: {
    dashboard:   { view: true,  create: true,  edit: true,  delete: true  },
    devices:     { view: true,  create: true,  edit: true,  delete: true  },
    pos:         { view: true,  create: true,  edit: true,  delete: true  },
    purchases:   { view: true,  create: true,  edit: true,  delete: true  },
    products:    { view: true,  create: true,  edit: true,  delete: true  },
    suppliers:   { view: true,  create: true,  edit: true,  delete: true  },
    customers:   { view: true,  create: true,  edit: true,  delete: true  },
    expenses:    { view: true,  create: true,  edit: true,  delete: true  },
    attendance:  { view: true,  create: true,  edit: true,  delete: true  },
    reports:     { view: true,  create: true,  edit: true,  delete: true  },
    ledger:      { view: true,  create: true,  edit: true,  delete: true  },
    audit:       { view: true,  create: true,  edit: true,  delete: true  },
    import:      { view: true,  create: true,  edit: true,  delete: true  },
    settings:    { view: true,  create: true,  edit: true,  delete: true  },
    permissions: { view: true,  create: true,  edit: true,  delete: true  },
  },
  manager: {
    dashboard:   { view: true,  create: true,  edit: true,  delete: true  },
    devices:     { view: true,  create: true,  edit: true,  delete: true  },
    pos:         { view: true,  create: true,  edit: true,  delete: true  },
    purchases:   { view: true,  create: true,  edit: true,  delete: true  },
    products:    { view: true,  create: true,  edit: true,  delete: true  },
    suppliers:   { view: true,  create: true,  edit: true,  delete: true  },
    customers:   { view: true,  create: true,  edit: true,  delete: true  },
    expenses:    { view: true,  create: true,  edit: true,  delete: true  },
    attendance:  { view: true,  create: true,  edit: true,  delete: true  },
    reports:     { view: true,  create: true,  edit: true,  delete: true  },
    ledger:      { view: true,  create: true,  edit: true,  delete: true  },
    audit:       { view: true,  create: true,  edit: true,  delete: true  },
    import:      { view: true,  create: true,  edit: true,  delete: true  },
    settings:    { view: false, create: false, edit: false, delete: false },
    permissions: { view: false, create: false, edit: false, delete: false },
  },
  cashier: {
    dashboard:   { view: true,  create: false, edit: false, delete: false },
    devices:     { view: false, create: false, edit: false, delete: false },
    pos:         { view: true,  create: true,  edit: true,  delete: false },
    purchases:   { view: false, create: false, edit: false, delete: false },
    products:    { view: false, create: false, edit: false, delete: false },
    suppliers:   { view: false, create: false, edit: false, delete: false },
    customers:   { view: true,  create: true,  edit: true,  delete: false },
    expenses:    { view: false, create: false, edit: false, delete: false },
    attendance:  { view: false, create: false, edit: false, delete: false },
    reports:     { view: false, create: false, edit: false, delete: false },
    ledger:      { view: false, create: false, edit: false, delete: false },
    audit:       { view: false, create: false, edit: false, delete: false },
    import:      { view: false, create: false, edit: false, delete: false },
    settings:    { view: false, create: false, edit: false, delete: false },
    permissions: { view: false, create: false, edit: false, delete: false },
  },
  warehouse: {
    dashboard:   { view: true,  create: false, edit: false, delete: false },
    devices:     { view: true,  create: true,  edit: true,  delete: false },
    pos:         { view: false, create: false, edit: false, delete: false },
    purchases:   { view: true,  create: true,  edit: true,  delete: false },
    products:    { view: true,  create: true,  edit: true,  delete: false },
    suppliers:   { view: true,  create: true,  edit: true,  delete: false },
    customers:   { view: false, create: false, edit: false, delete: false },
    expenses:    { view: false, create: false, edit: false, delete: false },
    attendance:  { view: false, create: false, edit: false, delete: false },
    reports:     { view: false, create: false, edit: false, delete: false },
    ledger:      { view: false, create: false, edit: false, delete: false },
    audit:       { view: false, create: false, edit: false, delete: false },
    import:      { view: false, create: false, edit: false, delete: false },
    settings:    { view: false, create: false, edit: false, delete: false },
    permissions: { view: false, create: false, edit: false, delete: false },
  },
}

export function can(
  role: UserRole | null | undefined,
  action: Action,
  resource: Resource
): boolean {
  if (!role) return false
  return PERMISSIONS[role]?.[resource]?.[action] ?? false
}

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
