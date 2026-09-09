// src/pages/audit/AuditLogsPage.tsx
import { useState, useMemo } from 'react'
import {
  Search, Shield, ChevronLeft, ChevronRight,
  User, Clock, FileText, RefreshCw,
  Eye, X, Filter, ChevronDown,
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/cn'
import type { AuditLog } from '@/types/database'

const PAGE_SIZE = 25

// ── Maps ──────────────────────────────────────────────────────────────────────
const ACTION_MAP: Record<string, { label: string; variant: 'success' | 'danger' | 'info' | 'warning' | 'neutral' }> = {
  create: { label: 'إنشاء',  variant: 'success' },
  update: { label: 'تعديل',  variant: 'info'    },
  delete: { label: 'حذف',    variant: 'danger'  },
  login:  { label: 'دخول',   variant: 'neutral' },
  logout: { label: 'خروج',   variant: 'neutral' },
  sell:   { label: 'بيع',    variant: 'warning' },
  buy:    { label: 'شراء',   variant: 'info'    },
  cancel: { label: 'إلغاء',  variant: 'danger'  },
  confirm:{ label: 'تأكيد',  variant: 'success' },
  pay:    { label: 'دفع',    variant: 'success' },
}

const ENTITY_MAP: Record<string, string> = {
  // مفرد
  mobile_device:    'جهاز',
  product:          'منتج',
  customer:         'عميل',
  supplier:         'مورد',
  purchase_invoice: 'فاتورة شراء',
  sale_invoice:     'فاتورة بيع',
  profile:          'مستخدم',
  payment:          'دفعة',
  expense:          'مصروف',
  employee:         'موظف',
  brand:            'ماركة',
  model:            'موديل',
  // جمع — القيم الفعلية في الـ DB
  mobile_devices:           'جهاز',
  products:                 'منتج',
  customers:                'عميل',
  suppliers:                'مورد',
  purchase_invoices:        'فاتورة شراء',
  sale_invoices:            'فاتورة بيع',
  profiles:                 'مستخدم',
  payments:                 'دفعة',
  expenses:                 'مصروف',
  employees:                'موظف',
  mobile_brands:            'ماركة',
  mobile_models:            'موديل',
  purchase_invoice_devices: 'جهاز في فاتورة شراء',
  purchase_invoice_products:'منتج في فاتورة شراء',
  sale_invoice_devices:     'جهاز في فاتورة بيع',
  sale_invoice_products:    'منتج في فاتورة بيع',
  product_categories:       'فئة منتجات',
  expense_categories:       'فئة مصروفات',
  attendance_records:       'سجل حضور',
  role_permissions:         'صلاحيات',
}

// ── Types ─────────────────────────────────────────────────────────────────────
type LogRow = AuditLog & {
  user_name:   string
  entity_type: string | null
  description: string | null
  old_data:    Record<string, unknown> | null
  new_data:    Record<string, unknown> | null
}

// ── Fetch ─────────────────────────────────────────────────────────────────────
async function fetchLogs(): Promise<LogRow[]> {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*, profiles!user_id ( full_name )')
    .order('created_at', { ascending: false })
    .limit(2000)
  if (error) throw error

  return ((data ?? []) as unknown[]).map(row => {
    const r    = row as Record<string, unknown>
    const prof = r['profiles'] as Record<string, unknown> | null
    return {
      ...r,
      user_name:   String(prof?.['full_name'] ?? '—'),
      entity_type: r['entity_type'] as string | null ?? r['table_name'] as string | null ?? null,
      description: r['description'] as string | null ?? null,
      old_data:    r['old_data'] as Record<string, unknown> | null ?? null,
      new_data:    r['new_data'] as Record<string, unknown> | null ?? null,
    } as LogRow
  })
}

// ── Detail Modal ──────────────────────────────────────────────────────────────
function DetailModal({ log, onClose }: { log: LogRow; onClose: () => void }) {
  const action = ACTION_MAP[log.action] ?? { label: log.action, variant: 'neutral' as const }
  const entity = ENTITY_MAP[log.entity_type ?? ''] ?? log.entity_type ?? '—'

  function renderJson(obj: Record<string, unknown> | null, title: string, colorClass: string) {
    if (!obj || Object.keys(obj).length === 0) return null
    const entries = Object.entries(obj)
    return (
      <div className={cn('rounded-lg border p-3', colorClass)}>
        <p className="text-xs font-semibold mb-2 opacity-70">{title}</p>
        <div className="space-y-1">
          {entries.map(([k, v]) => (
            <div key={k} className="flex gap-2 text-xs">
              <span className="font-mono opacity-60 flex-shrink-0 min-w-[120px]">{k}:</span>
              <span className="font-medium break-all">
                {v === null ? <span className="opacity-40">null</span>
                  : typeof v === 'object' ? JSON.stringify(v)
                  : String(v)}
              </span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Highlight changed fields between old and new
  function renderDiff() {
    if (!log.old_data || !log.new_data) return null
    const changed = Object.keys(log.new_data).filter(k =>
      JSON.stringify(log.old_data![k]) !== JSON.stringify(log.new_data![k])
    )
    if (changed.length === 0) return null
    return (
      <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-3">
        <p className="text-xs font-semibold mb-2 text-amber-700 dark:text-amber-400">الحقول المعدّلة ({changed.length})</p>
        <div className="space-y-2">
          {changed.map(k => (
            <div key={k} className="text-xs">
              <span className="font-mono text-amber-600 dark:text-amber-400 font-semibold">{k}</span>
              <div className="flex gap-2 mt-0.5 pr-2">
                <div className="flex-1 bg-red-100 dark:bg-red-900/30 rounded px-2 py-1 text-red-700 dark:text-red-400 line-through">
                  {String(log.old_data![k] ?? 'null')}
                </div>
                <span className="text-gray-400 flex-shrink-0 self-center">←</span>
                <div className="flex-1 bg-green-100 dark:bg-green-900/30 rounded px-2 py-1 text-green-700 dark:text-green-400 font-semibold">
                  {String(log.new_data![k] ?? 'null')}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Eye size={16} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="font-bold text-gray-900 dark:text-white text-sm">تفاصيل العملية</p>
              <p className="text-xs text-gray-400">{new Date(log.created_at).toLocaleString('ar-EG')}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Meta */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
              <p className="text-xs text-gray-400 mb-1">المستخدم</p>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                  <User size={11} className="text-blue-600" />
                </div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{log.user_name}</p>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
              <p className="text-xs text-gray-400 mb-1">الإجراء</p>
              <Badge variant={action.variant}>{action.label}</Badge>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
              <p className="text-xs text-gray-400 mb-1">نوع السجل</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{entity}</p>
            </div>
            {log.description && (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-1">الوصف</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{log.description}</p>
              </div>
            )}
          </div>

          {/* Diff — for updates */}
          {log.action === 'update' && renderDiff()}

          {/* Old / New data */}
          <div className="space-y-3">
            {renderJson(log.old_data, 'البيانات قبل التعديل', 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10 text-red-800 dark:text-red-300')}
            {renderJson(log.new_data, 'البيانات بعد التعديل', 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10 text-green-800 dark:text-green-300')}
          </div>

          {!log.old_data && !log.new_data && !log.description && (
            <div className="text-center py-8 text-gray-400">
              <FileText size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">لا توجد تفاصيل إضافية لهذه العملية</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export function AuditLogsPage() {
  const { data: logs = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['audit_logs'],
    queryFn:  fetchLogs,
    staleTime: 30_000,
  })

  const [search,      setSearch]      = useState('')
  const [page,        setPage]        = useState(1)
  const [selectedLog, setSelectedLog] = useState<LogRow | null>(null)
  const [filterUser,  setFilterUser]  = useState('')
  const [filterAction,setFilterAction]= useState('')

  // Unique users & actions for filter dropdowns
  const users   = useMemo(() => [...new Set(logs.map(l => l.user_name))].filter(u => u !== '—'), [logs])
  const actions  = useMemo(() => [...new Set(logs.map(l => l.action))], [logs])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return logs.filter(l => {
      if (filterUser   && l.user_name !== filterUser) return false
      if (filterAction && l.action    !== filterAction) return false
      if (!q) return true
      return (
        l.action.toLowerCase().includes(q)            ||
        (l.entity_type ?? '').toLowerCase().includes(q) ||
        (l.description ?? '').toLowerCase().includes(q) ||
        l.user_name.toLowerCase().includes(q)
      )
    })
  }, [logs, search, filterUser, filterAction])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function resetFilters() {
    setSearch(''); setFilterUser(''); setFilterAction(''); setPage(1)
  }

  return (
    <div className="max-w-7xl mx-auto space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">سجل العمليات</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">تتبع كل حركة في النظام</p>
        </div>
        <div className="flex items-center gap-2">
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 space-y-3">
        <div className="relative">
          <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="بحث بالإجراء، المستخدم، الوصف..."
            className="w-full h-9 pr-9 pl-3 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
          />
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <Filter size={13} className="text-gray-400" />

          {/* Filter by user */}
          <div className="relative">
            <select
              value={filterUser}
              onChange={e => { setFilterUser(e.target.value); setPage(1) }}
              className="h-8 pr-3 pl-7 border border-gray-200 dark:border-gray-700 rounded-lg text-xs bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:border-blue-500 appearance-none cursor-pointer"
            >
              <option value="">كل المستخدمين</option>
              {users.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
            <ChevronDown size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>

          {/* Filter by action */}
          <div className="relative">
            <select
              value={filterAction}
              onChange={e => { setFilterAction(e.target.value); setPage(1) }}
              className="h-8 pr-3 pl-7 border border-gray-200 dark:border-gray-700 rounded-lg text-xs bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:border-blue-500 appearance-none cursor-pointer"
            >
              <option value="">كل الإجراءات</option>
              {actions.map(a => <option key={a} value={a}>{ACTION_MAP[a]?.label ?? a}</option>)}
            </select>
            <ChevronDown size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>

          {(filterUser || filterAction || search) && (
            <button onClick={resetFilters} className="h-8 px-3 text-xs rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center gap-1">
              <X size={11} /> مسح الفلاتر
            </button>
          )}

          <span className="text-xs text-gray-400 mr-auto">
            {filtered.length} سجل
            {(filterUser || filterAction) && ` — مفلتر`}
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                {['التوقيت', 'المستخدم', 'الإجراء', 'النوع', 'الوصف', ''].map((h, i) => (
                  <th key={i} className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 text-right whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-100 dark:border-gray-800">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center">
                    <Shield size={32} className="mx-auto mb-2 opacity-20 text-gray-400" />
                    <p className="text-gray-400 dark:text-gray-600 text-sm">لا توجد سجلات</p>
                    {(filterUser || filterAction || search) && (
                      <button onClick={resetFilters} className="mt-2 text-xs text-blue-500 hover:underline">مسح الفلاتر</button>
                    )}
                  </td>
                </tr>
              ) : paginated.map(log => {
                const action = ACTION_MAP[log.action] ?? { label: log.action, variant: 'neutral' as const }
                const entity = ENTITY_MAP[log.entity_type ?? ''] ?? log.entity_type ?? '—'
                const hasDetails = !!(log.old_data || log.new_data || log.description) || log.action === 'update' || log.action === 'delete'
                return (
                  <tr
                    key={log.id}
                    className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                        <Clock size={11} />
                        {new Date(log.created_at).toLocaleString('ar-EG')}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                            {log.user_name.charAt(0)}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">{log.user_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={action.variant}>{action.label}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <FileText size={11} className="text-gray-400" />
                        <span className="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">{entity}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 max-w-[200px]">
                      <p className="text-sm text-gray-700 dark:text-gray-300 truncate">
                        {log.description ?? '—'}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      {hasDetails && (
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                          title="عرض التفاصيل"
                        >
                          <Eye size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-800">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            عرض <span className="font-semibold text-gray-900 dark:text-white">{((page-1)*PAGE_SIZE)+1}–{Math.min(page*PAGE_SIZE, filtered.length)}</span> من <span className="font-semibold text-gray-900 dark:text-white">{filtered.length}</span>
          </p>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 transition-colors">
                <ChevronRight size={14} />
              </button>
              <span className="text-xs text-gray-600 dark:text-gray-400 px-1">{page} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 transition-colors">
                <ChevronLeft size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {selectedLog && <DetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />}

    </div>
  )
}
