// src/pages/audit/AuditLogsPage.tsx
import { useState, useMemo } from 'react'
import {
  Search, Shield, ChevronLeft, ChevronRight,
  User, Clock, FileText, RefreshCw,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/cn'
import type { AuditLog } from '@/types/database'

const PAGE_SIZE = 20

const ACTION_MAP: Record<string, { label: string; variant: 'success' | 'danger' | 'info' | 'warning' | 'neutral' }> = {
  create: { label: 'إنشاء',  variant: 'success' },
  update: { label: 'تعديل',  variant: 'info'    },
  delete: { label: 'حذف',    variant: 'danger'  },
  login:  { label: 'دخول',   variant: 'neutral' },
  logout: { label: 'خروج',   variant: 'neutral' },
  sell:   { label: 'بيع',    variant: 'warning' },
  buy:    { label: 'شراء',   variant: 'info'    },
}

const ENTITY_MAP: Record<string, string> = {
  mobile_device:     'جهاز',
  product:           'منتج',
  customer:          'عميل',
  supplier:          'مورد',
  purchase_invoice:  'فاتورة شراء',
  sale_invoice:      'فاتورة بيع',
  profile:           'مستخدم',
}

async function fetchLogs(): Promise<(AuditLog & { user_name: string })[]> {
  const { data, error } = await supabase
    .from('audit_logs')
    .select(`
      *,
      profiles!user_id ( full_name )
    `)
    .order('created_at', { ascending: false })
    .limit(500)
  if (error) throw error

  return ((data ?? []) as unknown[]).map(row => {
    const r    = row as Record<string, unknown>
    const prof = r['profiles'] as Record<string, unknown> | null
    return {
      ...r,
      user_name: String(prof?.['full_name'] ?? '—'),
    } as AuditLog & { user_name: string }
  })
}

export function AuditLogsPage() {
  const { data: logs = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['audit_logs'],
    queryFn:  fetchLogs,
    staleTime: 30_000,
  })

  const [search, setSearch] = useState('')
  const [page,   setPage]   = useState(1)

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    if (!q) return logs
    return logs.filter(l =>
      l.action.toLowerCase().includes(q)         ||
      (l.entity_type ?? '').toLowerCase().includes(q) ||
      (l.description ?? '').toLowerCase().includes(q) ||
      l.user_name.toLowerCase().includes(q)
    )
  }, [logs, search])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="max-w-7xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">سجل العمليات</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">تتبع كل حركة في النظام</p>
        </div>
        <button
          onClick={() => void refetch()}
          disabled={isFetching}
          className="h-9 px-4 text-sm font-medium rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
          تحديث
        </button>
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3">
        <div className="relative">
          <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="بحث بالإجراء، المستخدم، الوصف..."
            className="w-full h-9 pr-9 pl-3 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                {['التوقيت', 'المستخدم', 'الإجراء', 'النوع', 'الوصف'].map(h => (
                  <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide text-right whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-100 dark:border-gray-800">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-16 text-center">
                    <Shield size={32} className="mx-auto mb-2 opacity-20 text-gray-400" />
                    <p className="text-gray-400 dark:text-gray-600">لا توجد سجلات</p>
                  </td>
                </tr>
              ) : paginated.map(log => {
                const action = ACTION_MAP[log.action] ?? { label: log.action, variant: 'neutral' as const }
                const entity = ENTITY_MAP[log.entity_type ?? ''] ?? log.entity_type ?? '—'
                return (
                  <tr key={log.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                        <Clock size={12} />
                        {new Date(log.created_at).toLocaleString('ar-EG')}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                          <User size={11} className="text-blue-600 dark:text-blue-400" />
                        </div>
                        <span className="text-sm text-gray-900 dark:text-white whitespace-nowrap">{log.user_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={action.variant}>{action.label}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <FileText size={12} className="text-gray-400" />
                        <span className="text-xs text-gray-600 dark:text-gray-400">{entity}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <p className="text-sm text-gray-700 dark:text-gray-300 truncate">
                        {log.description ?? '—'}
                      </p>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            عرض <span className="font-semibold text-gray-900 dark:text-white">{filtered.length}</span> سجل
          </p>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 transition-colors">
                <ChevronRight size={14} />
              </button>
              <span className="text-sm text-gray-700 dark:text-gray-300 px-2">{page} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 transition-colors">
                <ChevronLeft size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
