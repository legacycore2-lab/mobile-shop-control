import { exportToCsv, SUPPLIER_EXPORT_HEADERS } from '@/lib/exportUtils'
import { useState, useMemo } from 'react'
import {
  Search, Plus, Download, Phone, MapPin,
  TrendingUp, Users, CheckCircle, XCircle,
  Eye, Pencil, Trash2, ChevronLeft, ChevronRight,
} from 'lucide-react'
import {
  useSuppliers, useSupplierStats,
  useCreateSupplier, useUpdateSupplier, useDeleteSupplier,
} from '@/hooks/useSuppliers'
import { useAuth } from '@/lib/auth'
import type { Supplier } from '@/types/database'
import { cn } from '@/lib/cn'

// ── Types ────────────────────────────────────────────────────────────────────
type FilterStatus = 'all' | 'active' | 'inactive'

interface FormState {
  name: string
  phone: string
  address: string
  opening_balance: string
  notes: string
  is_active: boolean
}

const EMPTY_FORM: FormState = {
  name: '', phone: '', address: '',
  opening_balance: '0', notes: '', is_active: true,
}

const PAGE_SIZE = 10

// ── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, colorClass, bgClass }: {
  label: string; value: string | number
  icon: React.ElementType; colorClass: string; bgClass: string
}) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 flex items-center gap-4">
      <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0', bgClass)}>
        <Icon size={18} className={colorClass} />
      </div>
      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">{value}</p>
      </div>
    </div>
  )
}

// ── Modal ────────────────────────────────────────────────────────────────────
function SupplierModal({ supplier, onClose }: {
  supplier: Supplier | null
  onClose: () => void
}) {
  const { profile } = useAuth()
  const createMutation = useCreateSupplier()
  const updateMutation = useUpdateSupplier()

  const [form, setForm] = useState<FormState>(
    supplier
      ? { name: supplier.name, phone: supplier.phone ?? '', address: supplier.address ?? '',
          opening_balance: String(supplier.opening_balance), notes: supplier.notes ?? '',
          is_active: supplier.is_active }
      : EMPTY_FORM
  )
  const [error, setError] = useState('')

  const set = (k: keyof FormState, v: string | boolean) =>
    setForm(f => ({ ...f, [k]: v }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      if (supplier) {
        await updateMutation.mutateAsync({ id: supplier.id, form: {
          ...form, opening_balance: Number(form.opening_balance),
        }})
      } else {
        await createMutation.mutateAsync({
          ...form,
          opening_balance: Number(form.opening_balance),
          created_by: profile?.id ?? '',
        })
      }
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ')
    }
  }

  const loading = createMutation.isPending || updateMutation.isPending

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white">
              {supplier ? 'تعديل مورد' : 'إضافة مورد جديد'}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {supplier ? `تعديل بيانات ${supplier.name}` : 'أدخل بيانات المورد الجديد'}
            </p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
            ✕
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 flex flex-col gap-4">
            {/* Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                اسم المورد <span className="text-red-500">*</span>
              </label>
              <input
                value={form.name} onChange={e => set('name', e.target.value)}
                placeholder="مثال: شركة النور للتوريدات" required
                className="h-10 border border-gray-200 dark:border-gray-700 rounded-lg px-3 text-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
              />
            </div>

            {/* Phone + Balance */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">رقم التليفون</label>
                <input
                  value={form.phone} onChange={e => set('phone', e.target.value)}
                  placeholder="01XXXXXXXXX" dir="ltr"
                  className="h-10 border border-gray-200 dark:border-gray-700 rounded-lg px-3 text-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all text-right"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">الرصيد الافتتاحي</label>
                <input
                  type="number" min="0" value={form.opening_balance}
                  onChange={e => set('opening_balance', e.target.value)}
                  placeholder="0"
                  className="h-10 border border-gray-200 dark:border-gray-700 rounded-lg px-3 text-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
                />
              </div>
            </div>

            {/* Address */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">العنوان</label>
              <input
                value={form.address} onChange={e => set('address', e.target.value)}
                placeholder="المدينة، الحي، الشارع"
                className="h-10 border border-gray-200 dark:border-gray-700 rounded-lg px-3 text-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
              />
            </div>

            {/* Notes */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">ملاحظات</label>
              <textarea
                value={form.notes} onChange={e => set('notes', e.target.value)}
                placeholder="أي ملاحظات إضافية..." rows={3}
                className="border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all resize-none"
              />
            </div>

            {/* Active toggle */}
            {supplier && (
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={form.is_active}
                  onChange={e => set('is_active', e.target.checked)}
                  className="w-4 h-4 accent-blue-600 cursor-pointer" />
                <span className="text-sm text-gray-700 dark:text-gray-300">مورد نشط</span>
              </label>
            )}

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-2.5 text-sm text-red-700 dark:text-red-400">
                {error}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex gap-3 justify-end px-6 py-4 border-t border-gray-100 dark:border-gray-800">
            <button type="button" onClick={onClose}
              className="h-9 px-4 text-sm font-medium rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              إلغاء
            </button>
            <button type="submit" disabled={loading}
              className="h-9 px-5 text-sm font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50 flex items-center gap-2">
              {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {supplier ? 'حفظ التعديلات' : 'إضافة المورد'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────
export function SuppliersPage() {
  const { data: suppliers = [], isLoading } = useSuppliers()
  const { data: stats } = useSupplierStats()
  const deleteMutation = useDeleteSupplier()

  const [search,      setSearch]      = useState('')
  const [filter,      setFilter]      = useState<FilterStatus>('all')
  const [page,        setPage]        = useState(1)
  const [modal,       setModal]       = useState<'add' | 'edit' | null>(null)
  const [selected,    setSelected]    = useState<Supplier | null>(null)

  const filtered = useMemo(() => {
    return suppliers.filter(s => {
      const q = search.toLowerCase()
      const matchSearch = !q || s.name.toLowerCase().includes(q) || (s.phone ?? '').includes(q)
      const matchFilter =
        filter === 'all' ||
        (filter === 'active'   &&  s.is_active) ||
        (filter === 'inactive' && !s.is_active)
      return matchSearch && matchFilter
    })
  }, [suppliers, search, filter])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function openAdd()         { setSelected(null);    setModal('add')  }
  function openEdit(s: Supplier) { setSelected(s);   setModal('edit') }
  function closeModal()      { setModal(null);        setSelected(null) }

  async function handleDelete(id: string) {
    if (!confirm('هل أنت متأكد من حذف هذا المورد؟')) return
    await deleteMutation.mutateAsync(id)
  }

  const STATS_CONFIG = [
    { label:'إجمالي الموردين',  value: stats?.total    ?? 0,   icon: Users,        colorClass:'text-blue-600 dark:text-blue-400',   bgClass:'bg-blue-50 dark:bg-blue-900/20'   },
    { label:'موردون نشطون',     value: stats?.active   ?? 0,   icon: CheckCircle,  colorClass:'text-green-600 dark:text-green-400',  bgClass:'bg-green-50 dark:bg-green-900/20'  },
    { label:'إجمالي الأرصدة',   value: `${(stats?.totalBalance ?? 0).toLocaleString('ar-EG')} ج`, icon: TrendingUp, colorClass:'text-purple-600 dark:text-purple-400', bgClass:'bg-purple-50 dark:bg-purple-900/20' },
    { label:'غير نشطين',        value: stats?.inactive ?? 0,   icon: XCircle,      colorClass:'text-amber-600 dark:text-amber-400',  bgClass:'bg-amber-50 dark:bg-amber-900/20'  },
  ]

  return (
    <div className="max-w-7xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">الموردون</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">إدارة بيانات وحسابات الموردين</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => exportToCsv('suppliers', SUPPLIER_EXPORT_HEADERS, filtered)} className="h-9 px-4 text-sm font-medium rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-2">
            <Download size={14} /> تصدير CSV
          </button>
          <button onClick={openAdd}
            className="h-9 px-4 text-sm font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors flex items-center gap-2">
            <Plus size={14} /> مورد جديد
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {STATS_CONFIG.map(s => <StatCard key={s.label} {...s} />)}
      </div>

      {/* Toolbar */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="بحث بالاسم أو التليفون..."
            className="w-full h-9 pr-9 pl-3 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
          />
        </div>
        <div className="flex gap-1.5">
          {([['all','الكل'], ['active','نشط'], ['inactive','غير نشط']] as const).map(([v, l]) => (
            <button key={v} onClick={() => { setFilter(v); setPage(1) }}
              className={cn(
                'h-8 px-3 text-xs font-medium rounded-lg border transition-colors',
                filter === v
                  ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400'
                  : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700',
              )}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                {['#','اسم المورد','التليفون','العنوان','الرصيد الافتتاحي','الحالة','ملاحظات','إجراءات'].map((h, i) => (
                  <th key={h} className={cn('px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap', i >= 4 && 'text-center')}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-100 dark:border-gray-800">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center text-gray-400 dark:text-gray-600">
                    <Users size={32} className="mx-auto mb-2 opacity-30" />
                    <p>لا توجد موردون</p>
                  </td>
                </tr>
              ) : paginated.map((s, i) => (
                <tr key={s.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="px-4 py-3 text-xs text-gray-400 dark:text-gray-600 font-mono">
                    {String((page - 1) * PAGE_SIZE + i + 1).padStart(2, '0')}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-900 dark:text-white">{s.name}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-600 mt-0.5">
                      {new Date(s.created_at).toLocaleDateString('ar-EG')}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <Phone size={12} className="text-gray-400 dark:text-gray-600" />
                      <span className="font-mono text-xs text-gray-700 dark:text-gray-300">{s.phone ?? '—'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <MapPin size={12} className="text-gray-400 dark:text-gray-600 flex-shrink-0" />
                      <span className="text-xs text-gray-600 dark:text-gray-400 truncate max-w-36">{s.address ?? '—'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={cn('font-semibold text-sm', s.opening_balance > 0 ? 'text-purple-600 dark:text-purple-400' : 'text-gray-500 dark:text-gray-500')}>
                      {(s.opening_balance ?? 0).toLocaleString('ar-EG')} ج
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border',
                      s.is_active
                        ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800'
                        : 'bg-red-50   dark:bg-red-900/20   text-red-700   dark:text-red-400   border-red-200   dark:border-red-800')}>
                      <span className={cn('w-1.5 h-1.5 rounded-full', s.is_active ? 'bg-green-500' : 'bg-red-500')} />
                      {s.is_active ? 'نشط' : 'موقوف'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 max-w-36">
                    <p className="truncate">{s.notes || '—'}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 justify-center">
                      <button title="عرض"
                        className="w-7 h-7 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <Eye size={13} />
                      </button>
                      <button title="تعديل" onClick={() => openEdit(s)}
                        className="w-7 h-7 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-200 dark:hover:border-blue-800 transition-colors">
                        <Pencil size={13} />
                      </button>
                      <button title="حذف" onClick={() => handleDelete(s.id)}
                        disabled={deleteMutation.isPending}
                        className="w-7 h-7 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-800 transition-colors disabled:opacity-50">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            عرض <span className="font-semibold text-gray-900 dark:text-white">{filtered.length}</span> من{' '}
            <span className="font-semibold text-gray-900 dark:text-white">{suppliers.length}</span> مورد
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

      {/* Modal */}
      {modal && (
        <SupplierModal
          supplier={modal === 'edit' ? selected : null}
          onClose={closeModal}
        />
      )}
    </div>
  )
}
