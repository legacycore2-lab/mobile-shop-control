// src/pages/permissions/PermissionsPage.tsx
import { useState, useCallback } from 'react'
import { Shield, Save, RotateCcw, Check, X, AlertCircle, CheckCircle, Loader } from 'lucide-react'
import { cn } from '@/lib/cn'
import {
  PERMISSIONS, RESOURCE_LABELS, ACTION_LABELS, ROLE_LABELS,
  type PermissionMatrix, type Resource, type Action,
} from '@/lib/permissions'
import type { UserRole } from '@/types/database'

const ROLES:     UserRole[] = ['owner', 'manager', 'cashier', 'warehouse']
const RESOURCES: Resource[] = [
  'dashboard','devices','pos','purchases','products',
  'suppliers','customers','expenses','attendance',
  'reports','ledger','audit','import','settings','permissions',
]
const ACTIONS: Action[] = ['view','create','edit','delete']

const GITHUB_TOKEN = import.meta.env.VITE_GITHUB_TOKEN ?? ''
const REPO         = 'legacycore2-lab/mobile-shop-control'
const FILE_PATH    = 'src/lib/permissions.ts'

function buildPermissionsFile(matrix: PermissionMatrix): string {
  const roleBlock = (role: UserRole) => {
    const resources = RESOURCES.map(res => {
      const perms = ACTIONS.map(a =>
        `      ${a}: ${matrix[role][res][a] ? 'true ' : 'false'},`
      ).join('\n')
      return `    ${res.padEnd(12)}: {\n${perms}\n    },`
    }).join('\n')
    return `  ${role}: {\n${resources}\n  },`
  }

  return `// src/lib/permissions.ts
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
${ROLES.map(roleBlock).join('\n')}
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
`
}

type SaveStatus = 'idle' | 'saving' | 'success' | 'error'

export function PermissionsPage() {
  const [matrix,     setMatrix]     = useState<PermissionMatrix>(() =>
    JSON.parse(JSON.stringify(PERMISSIONS))
  )
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [errorMsg,   setErrorMsg]   = useState('')

  // ── toggle single cell ──────────────────────────────────────
  const toggle = useCallback((role: UserRole, res: Resource, action: Action) => {
    if (role === 'owner') return  // owner دايماً full access
    setMatrix(prev => {
      const next = JSON.parse(JSON.stringify(prev)) as PermissionMatrix
      const current = next[role][res][action]
      next[role][res][action] = !current
      // rule: لو عطلت view، عطل الباقي تلقائي
      if (action === 'view' && current) {
        next[role][res].create = false
        next[role][res].edit   = false
        next[role][res].delete = false
      }
      // rule: لو فعّلت create/edit/delete، فعّل view تلقائي
      if (action !== 'view' && !current) {
        next[role][res].view = true
      }
      return next
    })
  }, [])

  // ── toggle entire row (resource) for a role ─────────────────
  const toggleRow = useCallback((role: UserRole, res: Resource) => {
    if (role === 'owner') return
    setMatrix(prev => {
      const next = JSON.parse(JSON.stringify(prev)) as PermissionMatrix
      const allOn = ACTIONS.every(a => next[role][res][a])
      ACTIONS.forEach(a => { next[role][res][a] = !allOn })
      return next
    })
  }, [])

  // ── toggle entire column (role) ─────────────────────────────
  const toggleCol = useCallback((role: UserRole) => {
    if (role === 'owner') return
    setMatrix(prev => {
      const next = JSON.parse(JSON.stringify(prev)) as PermissionMatrix
      const allOn = RESOURCES.every(res => ACTIONS.every(a => next[role][res][a]))
      RESOURCES.forEach(res => ACTIONS.forEach(a => { next[role][res][a] = !allOn }))
      return next
    })
  }, [])

  // ── reset to original ────────────────────────────────────────
  const reset = () => {
    setMatrix(JSON.parse(JSON.stringify(PERMISSIONS)))
    setSaveStatus('idle')
  }

  // ── save to GitHub ───────────────────────────────────────────
  const save = async () => {
    setSaveStatus('saving')
    setErrorMsg('')
    try {
      // get current SHA
      const shaRes = await fetch(
        `https://api.github.com/repos/${REPO}/contents/${FILE_PATH}`,
        { headers: { Authorization: `token ${GITHUB_TOKEN}`, Accept: 'application/vnd.github.v3+json' } }
      )
      const shaData = await shaRes.json()
      const sha = shaData.sha

      const content = buildPermissionsFile(matrix)
      const b64     = btoa(unescape(encodeURIComponent(content)))

      const putRes = await fetch(
        `https://api.github.com/repos/${REPO}/contents/${FILE_PATH}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `token ${GITHUB_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: 'chore: update permissions matrix',
            content: b64,
            sha,
            branch: 'main',
          }),
        }
      )

      if (!putRes.ok) throw new Error('فشل حفظ الملف على GitHub')

      // trigger deploy
      await fetch(
        `https://api.github.com/repos/${REPO}/actions/workflows/deploy.yml/dispatches`,
        {
          method: 'POST',
          headers: {
            Authorization: `token ${GITHUB_TOKEN}`,
            Accept: 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ ref: 'main' }),
        }
      )

      setSaveStatus('success')
      setTimeout(() => setSaveStatus('idle'), 4000)
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'حدث خطأ')
      setSaveStatus('error')
    }
  }

  // ── cell colors ──────────────────────────────────────────────
  const ACTION_COLORS: Record<Action, string> = {
    view:   'bg-blue-500',
    create: 'bg-green-500',
    edit:   'bg-amber-500',
    delete: 'bg-red-500',
  }
  const ACTION_RING: Record<Action, string> = {
    view:   'ring-blue-300  dark:ring-blue-700',
    create: 'ring-green-300 dark:ring-green-700',
    edit:   'ring-amber-300 dark:ring-amber-700',
    delete: 'ring-red-300   dark:ring-red-700',
  }

  const ROLE_COLORS: Record<UserRole, string> = {
    owner:     'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
    manager:   'bg-blue-100   dark:bg-blue-900/30   text-blue-700   dark:text-blue-300',
    cashier:   'bg-green-100  dark:bg-green-900/30  text-green-700  dark:text-green-300',
    warehouse: 'bg-amber-100  dark:bg-amber-900/30  text-amber-700  dark:text-amber-300',
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">إدارة الصلاحيات</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            تحكم في صلاحيات كل role على كل صفحة وعملية
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={reset}
            className="h-10 px-4 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-sm font-semibold flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <RotateCcw size={15} /> إعادة تعيين
          </button>
          <button
            onClick={save}
            disabled={saveStatus === 'saving'}
            className={cn(
              'h-10 px-4 rounded-xl text-white text-sm font-semibold flex items-center gap-2 transition-colors shadow-lg',
              saveStatus === 'success'
                ? 'bg-green-600 shadow-green-600/20'
                : saveStatus === 'error'
                ? 'bg-red-600 shadow-red-600/20'
                : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20 disabled:opacity-60'
            )}
          >
            {saveStatus === 'saving'  && <Loader    size={15} className="animate-spin" />}
            {saveStatus === 'success' && <CheckCircle size={15} />}
            {saveStatus === 'error'   && <AlertCircle size={15} />}
            {saveStatus === 'idle'    && <Save size={15} />}
            {saveStatus === 'saving'  ? 'جاري الحفظ والنشر...'
             : saveStatus === 'success' ? 'تم الحفظ والنشر ✓'
             : saveStatus === 'error'   ? 'فشل الحفظ'
             : 'حفظ ونشر'}
          </button>
        </div>
      </div>

      {/* Error */}
      {saveStatus === 'error' && errorMsg && (
        <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-sm text-red-700 dark:text-red-400">
          <AlertCircle size={15} /> {errorMsg}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4">
        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">نوع الصلاحية:</span>
        {ACTIONS.map(a => (
          <span key={a} className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
            <span className={cn('w-3 h-3 rounded-sm', ACTION_COLORS[a])} />
            {ACTION_LABELS[a]}
          </span>
        ))}
        <span className="text-xs text-gray-400 mr-4">💡 اضغط على اسم الصفحة لتفعيل/تعطيل كل صلاحياتها دفعة واحدة</span>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 dark:text-gray-400 w-36">
                  الصفحة / العملية
                </th>
                {ROLES.map(role => (
                  <th key={role} className="px-2 py-3 text-center" colSpan={4}>
                    <button
                      onClick={() => toggleCol(role)}
                      className={cn(
                        'px-3 py-1 rounded-lg text-xs font-bold transition-colors',
                        role === 'owner'
                          ? ROLE_COLORS[role] + ' cursor-default'
                          : ROLE_COLORS[role] + ' hover:opacity-80 cursor-pointer'
                      )}
                    >
                      {ROLE_LABELS[role]}
                      {role === 'owner' && <span className="mr-1 opacity-60">🔒</span>}
                    </button>
                    <div className="flex justify-center gap-1 mt-1.5">
                      {ACTIONS.map(a => (
                        <span key={a} className="text-[10px] text-gray-400 dark:text-gray-600 w-7 text-center">
                          {ACTION_LABELS[a]}
                        </span>
                      ))}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {RESOURCES.map(res => (
                <tr key={res} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                  {/* Resource label */}
                  <td className="px-4 py-3">
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                      {RESOURCE_LABELS[res]}
                    </span>
                  </td>

                  {/* Checkboxes per role */}
                  {ROLES.map(role => (
                    <td key={role} className="px-2 py-3" colSpan={4}>
                      <div className="flex justify-center gap-1">
                        {ACTIONS.map(action => {
                          const checked = matrix[role][res][action]
                          const isOwner = role === 'owner'
                          return (
                            <button
                              key={action}
                              onClick={() => toggle(role, res, action)}
                              disabled={isOwner}
                              title={`${ROLE_LABELS[role]} — ${ACTION_LABELS[action]} — ${RESOURCE_LABELS[res]}`}
                              className={cn(
                                'w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all',
                                isOwner
                                  ? 'cursor-default opacity-70'
                                  : 'cursor-pointer hover:scale-110',
                                checked
                                  ? cn(ACTION_COLORS[action], 'border-transparent text-white', !isOwner && 'ring-2 ring-offset-1 dark:ring-offset-gray-900 ' + ACTION_RING[action])
                                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-300 dark:text-gray-600'
                              )}
                            >
                              {checked ? <Check size={12} /> : <X size={11} />}
                            </button>
                          )
                        })}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info */}
      <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-xl px-4 py-3">
        <Shield size={15} className="text-amber-500 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-amber-700 dark:text-amber-300 space-y-1">
          <p className="font-semibold">بعد الحفظ:</p>
          <p>• هيتم رفع الملف على GitHub وتشغيل deploy تلقائي (~90 ثانية)</p>
          <p>• الصلاحيات الجديدة هتظهر بعد ما المستخدم يعمل hard refresh</p>
          <p>• المالك (owner) دايماً عنده كل الصلاحيات ومش ممكن تتغير</p>
        </div>
      </div>
    </div>
  )
}
