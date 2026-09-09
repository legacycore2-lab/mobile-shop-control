// src/pages/permissions/PermissionsPage.tsx
import { useState, useEffect, useCallback } from 'react'
import {
  Save, RotateCcw, Check, X, AlertCircle, CheckCircle, Loader, ShieldCheck,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import {
  RESOURCES, ACTIONS, RESOURCE_LABELS, ACTION_LABELS, ROLE_LABELS,
  type Resource, type Action, type RolePermission,
} from '@/lib/permissions'
import { useAllPermissions, useSavePermissions } from '@/hooks/usePermissions'
import type { UserRole } from '@/types/database'

const ROLES: UserRole[] = ['owner', 'manager', 'cashier', 'warehouse']

type LocalMatrix = Record<UserRole, Record<Resource, Record<Action, boolean>>>

function rowsToMatrix(rows: RolePermission[]): LocalMatrix {
  const m = {} as LocalMatrix
  for (const role of ROLES) {
    m[role] = {} as Record<Resource, Record<Action, boolean>>
    for (const res of RESOURCES) {
      m[role][res] = { view: false, create: false, edit: false, delete: false }
    }
  }
  for (const r of rows) {
    if (m[r.role as UserRole]?.[r.resource as Resource]) {
      m[r.role as UserRole][r.resource as Resource] = {
        view:   r.can_view,
        create: r.can_create,
        edit:   r.can_edit,
        delete: r.can_delete,
      }
    }
  }
  return m
}

function matrixToRows(matrix: LocalMatrix): RolePermission[] {
  const rows: RolePermission[] = []
  for (const role of ROLES) {
    for (const res of RESOURCES) {
      const p = matrix[role][res]
      rows.push({
        id: '',
        role:       role,
        resource:   res as Resource,
        can_view:   p.view,
        can_create: p.create,
        can_edit:   p.edit,
        can_delete: p.delete,
        updated_at: '',
      })
    }
  }
  return rows
}

type SaveStatus = 'idle' | 'saving' | 'success' | 'error'

export function PermissionsPage() {
  const { data: rows = [], isLoading } = useAllPermissions()
  const saveMut = useSavePermissions()

  const [matrix,     setMatrix]     = useState<LocalMatrix | null>(null)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [errorMsg,   setErrorMsg]   = useState('')

  // populate matrix from DB
  useEffect(() => {
    if (rows.length > 0) setMatrix(rowsToMatrix(rows))
  }, [rows])

  const reset = () => {
    setMatrix(rowsToMatrix(rows))
    setSaveStatus('idle')
    setErrorMsg('')
  }

  const toggle = useCallback((role: UserRole, res: Resource, action: Action) => {
    if (role === 'owner') return
    setMatrix(prev => {
      if (!prev) return prev
      const next: LocalMatrix = JSON.parse(JSON.stringify(prev))
      const current = next[role][res][action]
      next[role][res][action] = !current
      if (action === 'view' && current) {
        next[role][res].create = false
        next[role][res].edit   = false
        next[role][res].delete = false
      }
      if (action !== 'view' && !current) {
        next[role][res].view = true
      }
      return next
    })
  }, [])

  const toggleAllForRole = useCallback((role: UserRole) => {
    if (role === 'owner') return
    setMatrix(prev => {
      if (!prev) return prev
      const next: LocalMatrix = JSON.parse(JSON.stringify(prev))
      const allOn = RESOURCES.every(res => ACTIONS.every(a => next[role][res][a]))
      for (const res of RESOURCES) {
        for (const a of ACTIONS) next[role][res][a] = !allOn
      }
      return next
    })
  }, [])

  const toggleAllForResource = useCallback((role: UserRole, res: Resource) => {
    if (role === 'owner') return
    setMatrix(prev => {
      if (!prev) return prev
      const next: LocalMatrix = JSON.parse(JSON.stringify(prev))
      const allOn = ACTIONS.every(a => next[role][res][a])
      for (const a of ACTIONS) next[role][res][a] = !allOn
      return next
    })
  }, [])

  const save = async () => {
    if (!matrix) return
    setSaveStatus('saving')
    setErrorMsg('')
    try {
      await saveMut.mutateAsync(matrixToRows(matrix))
      setSaveStatus('success')
      setTimeout(() => setSaveStatus('idle'), 3000)
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'حدث خطأ')
      setSaveStatus('error')
    }
  }

  const ACTION_COLORS: Record<Action, string> = {
    view:   'bg-blue-500',
    create: 'bg-green-500',
    edit:   'bg-amber-500',
    delete: 'bg-red-500',
  }
  const ACTION_RING: Record<Action, string> = {
    view:   'ring-blue-300   dark:ring-blue-700',
    create: 'ring-green-300  dark:ring-green-700',
    edit:   'ring-amber-300  dark:ring-amber-700',
    delete: 'ring-red-300    dark:ring-red-700',
  }
  const ROLE_COLORS: Record<UserRole, string> = {
    owner:     'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
    manager:   'bg-blue-100   dark:bg-blue-900/30   text-blue-700   dark:text-blue-300',
    cashier:   'bg-green-100  dark:bg-green-900/30  text-green-700  dark:text-green-300',
    warehouse: 'bg-amber-100  dark:bg-amber-900/30  text-amber-700  dark:text-amber-300',
  }

  if (isLoading || !matrix) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader size={24} className="animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">إدارة الصلاحيات</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            تحكم في صلاحيات كل role — التغييرات فورية بدون deploy
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={reset}
            className="h-10 px-4 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-sm font-semibold flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <RotateCcw size={15} /> إلغاء التغييرات
          </button>
          <button
            onClick={save}
            disabled={saveStatus === 'saving'}
            className={cn(
              'h-10 px-4 rounded-xl text-white text-sm font-semibold flex items-center gap-2 transition-colors shadow-lg disabled:opacity-60',
              saveStatus === 'success' ? 'bg-green-600 shadow-green-600/20'
              : saveStatus === 'error' ? 'bg-red-600 shadow-red-600/20'
              : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'
            )}
          >
            {saveStatus === 'saving'  && <Loader      size={15} className="animate-spin" />}
            {saveStatus === 'success' && <CheckCircle size={15} />}
            {saveStatus === 'error'   && <AlertCircle size={15} />}
            {saveStatus === 'idle'    && <Save        size={15} />}
            {saveStatus === 'saving'  ? 'جاري الحفظ...'
             : saveStatus === 'success' ? 'تم الحفظ ✓'
             : saveStatus === 'error'   ? 'فشل الحفظ'
             : 'حفظ'}
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
        <span className="text-xs text-gray-400 mr-4">
          💡 اضغط على اسم الـ role لتفعيل/تعطيل كل صلاحياته دفعة واحدة
        </span>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 dark:text-gray-400 w-40">
                  الصفحة
                </th>
                {ROLES.map(role => (
                  <th key={role} className="px-2 py-3 text-center" colSpan={4}>
                    <button
                      onClick={() => toggleAllForRole(role)}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                        role === 'owner'
                          ? cn(ROLE_COLORS[role], 'cursor-default')
                          : cn(ROLE_COLORS[role], 'hover:opacity-80 cursor-pointer')
                      )}
                    >
                      {ROLE_LABELS[role]}
                      {role === 'owner' && <span className="mr-1 opacity-50 text-[10px]">🔒</span>}
                    </button>
                    <div className="flex justify-center gap-1 mt-2">
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
                  <td className="px-4 py-3">
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                      {RESOURCE_LABELS[res]}
                    </span>
                  </td>
                  {ROLES.map(role => {
                    const isOwner = role === 'owner'
                    return (
                      <td key={role} className="px-2 py-2.5" colSpan={4}>
                        <div className="flex justify-center gap-1">
                          {ACTIONS.map(action => {
                            const checked = matrix[role][res][action]
                            return (
                              <button
                                key={action}
                                onClick={() => toggle(role, res, action)}
                                disabled={isOwner}
                                title={`${ROLE_LABELS[role]} — ${ACTION_LABELS[action]} — ${RESOURCE_LABELS[res]}`}
                                className={cn(
                                  'w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all',
                                  isOwner ? 'cursor-default opacity-60' : 'cursor-pointer hover:scale-110',
                                  checked
                                    ? cn(
                                        ACTION_COLORS[action],
                                        'border-transparent text-white',
                                        !isOwner && 'ring-2 ring-offset-1 dark:ring-offset-gray-900 ' + ACTION_RING[action]
                                      )
                                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-300 dark:text-gray-600'
                                )}
                              >
                                {checked ? <Check size={12} /> : <X size={11} />}
                              </button>
                            )
                          })}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info */}
      <div className="flex items-start gap-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl px-4 py-3">
        <ShieldCheck size={15} className="text-blue-500 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
          <p className="font-semibold">ملاحظات:</p>
          <p>• الحفظ فوري — مفيش deploy</p>
          <p>• المستخدم هيشوف الصلاحيات الجديدة بعد تسجيل دخول من جديد أو refresh</p>
          <p>• المالك (owner) دايماً full access ومش ممكن يتغير</p>
        </div>
      </div>
    </div>
  )
}
