// src/pages/expenses/ExpensesPage.tsx
import { useState, useMemo } from 'react'
import {
  Plus, Pencil, Trash2, Search, TrendingDown,
  Calendar, Receipt, ChevronDown, X,
  Wallet, AlertCircle, CheckCircle,
} from 'lucide-react'
import {
  useExpenses, useExpenseStats, useExpenseCategories,
  useCreateExpense, useUpdateExpense, useDeleteExpense, useCreateExpenseCategory,
} from '@/hooks/useExpenses'
import { useAuth } from '@/lib/auth'
import { Badge } from '@/components/ui/Badge'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { cn } from '@/lib/cn'
import { fmt } from '@/lib/fmt'
import type { ExpenseView } from '@/types/database'

const METHOD_LABELS: Record<string, string> = {
  cash:          'نقدي',
  bank_transfer: 'تحويل بنكي',
  check:         'شيك',
  other:         'أخرى',
}

const METHOD_COLORS: Record<string, 'success' | 'info' | 'warning' | 'neutral'> = {
  cash:          'success',
  bank_transfer: 'info',
  check:         'warning',
  other:         'neutral',
}

const BLANK_FORM = {
  category_id: '', amount: '', description: '',
  expense_date: new Date().toISOString().split('T')[0],
  payment_method: 'cash', reference_number: '', notes: '',
}

function ExpenseModal({ expense, onClose }: { expense?: ExpenseView; onClose: () => void }) {
  const { profile }               = useAuth()
  const { data: categories = [] } = useExpenseCategories()
  const createExpense             = useCreateExpense()
  const updateExpense             = useUpdateExpense()
  const createCategory            = useCreateExpenseCategory()

  const [form, setForm] = useState({
    ...BLANK_FORM,
    ...(expense ? {
      category_id:      expense.category_id ?? '',
      amount:           String(expense.amount),
      description:      expense.description  ?? '',
      expense_date:     expense.expense_date,
      payment_method:   expense.payment_method,
      reference_number: expense.reference_number ?? '',
      notes:            expense.notes ?? '',
    } : {}),
  })
  const [newCat,  setNewCat]  = useState('')
  const [showCat, setShowCat] = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')

  const inp = 'h-10 w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all'
  const lbl = 'text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 block'
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  async function handleSave() {
    setError('')
    if (!form.amount || Number(form.amount) <= 0) return setError('المبلغ مطلوب')
    if (!form.expense_date) return setError('التاريخ مطلوب')
    setSaving(true)
    try {
      if (expense) {
        await updateExpense.mutateAsync({ id: expense.id, form })
      } else {
        await createExpense.mutateAsync({ ...form, created_by: profile?.id ?? '' })
      }
      onClose()
    } catch (e) { setError(e instanceof Error ? e.message : 'حدث خطأ') }
    finally { setSaving(false) }
  }

  async function handleAddCategory() {
    if (!newCat.trim()) return
    try {
      const cat = await createCategory.mutateAsync(newCat.trim())
      setForm(f => ({ ...f, category_id: cat.id }))
      setNewCat(''); setShowCat(false)
    } catch (e) { setError(e instanceof Error ? e.message : 'حدث خطأ') }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
              <Receipt size={15} className="text-red-600 dark:text-red-400" />
            </div>
            <p className="text-sm font-bold text-gray-900 dark:text-white">
              {expense ? 'تعديل مصروف' : 'إضافة مصروف'}
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
            <X size={15} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <label className={lbl}>المبلغ (ج) *</label>
            <input type="number" min="0.01" step="0.01" value={form.amount} onChange={set('amount')}
              placeholder="0.00" className={cn(inp, 'h-14 text-2xl font-bold text-center')} autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>التاريخ *</label>
              <input type="date" value={form.expense_date} onChange={set('expense_date')} className={inp} />
            </div>
            <div>
              <label className={lbl}>طريقة الدفع</label>
              <select value={form.payment_method} onChange={set('payment_method')} className={inp + ' cursor-pointer'}>
                <option value="cash">نقدي</option>
                <option value="bank_transfer">تحويل بنكي</option>
                <option value="check">شيك</option>
                <option value="other">أخرى</option>
              </select>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={lbl + ' mb-0'}>الفئة</label>
              <button onClick={() => setShowCat(s => !s)} className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                <Plus size={11} /> فئة جديدة
              </button>
            </div>
            {showCat && (
              <div className="flex gap-2 mb-2">
                <input value={newCat} onChange={e => setNewCat(e.target.value)} placeholder="اسم الفئة"
                  className={cn(inp, 'flex-1')} onKeyDown={e => e.key === 'Enter' && void handleAddCategory()} />
                <button onClick={() => void handleAddCategory()} className="h-10 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors">
                  إضافة
                </button>
              </div>
            )}
            <select value={form.category_id} onChange={set('category_id')} className={inp + ' cursor-pointer'}>
              <option value="">— بدون فئة —</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>الوصف</label>
            <input value={form.description} onChange={set('description')} placeholder="وصف المصروف..." className={inp} />
          </div>
          <div>
            <label className={lbl}>رقم المرجع / الإيصال</label>
            <input value={form.reference_number} onChange={set('reference_number')} placeholder="اختياري..." className={inp} />
          </div>
          <div>
            <label className={lbl}>ملاحظات</label>
            <textarea value={form.notes} onChange={set('notes')} rows={2} placeholder="ملاحظات إضافية..."
              className={cn(inp, 'h-auto py-2 resize-none')} />
          </div>
          {error && (
            <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-3 py-2.5 text-sm text-red-700 dark:text-red-400">
              <AlertCircle size={14} /> {error}
            </div>
          )}
        </div>
        <div className="px-5 pb-5 pt-3 border-t border-gray-100 dark:border-gray-800 flex-shrink-0">
          <button onClick={() => void handleSave()} disabled={saving}
            className="w-full h-11 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {saving && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            <CheckCircle size={15} />
            {expense ? 'حفظ التعديلات' : 'إضافة المصروف'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function ExpensesPage() {
  const { data: expenses = [], isLoading } = useExpenses()
  const { data: stats }                    = useExpenseStats()
  const deleteExpense                      = useDeleteExpense()

  const [search,      setSearch]     = useState('')
  const [filterCat,   setFilterCat]  = useState('')
  const [filterMonth, setFilterMonth] = useState('')
  const [showModal,   setShowModal]  = useState(false)
  const [editing,     setEditing]    = useState<ExpenseView | null>(null)
  const [deleting,    setDeleting]   = useState<string | null>(null)
  const [confirmDel,  setConfirmDel] = useState<ExpenseView | null>(null)

  const categories = useMemo(() => {
    const map = new Map<string, string>()
    expenses.forEach(e => { if (e.category_id) map.set(e.category_id, e.category_name) })
    return [...map.entries()].map(([id, name]) => ({ id, name }))
  }, [expenses])

  const months = useMemo(() => {
    const s = new Set<string>()
    expenses.forEach(e => { s.add(e.expense_date.slice(0, 7)) })
    return [...s].sort().reverse()
  }, [expenses])

  const filtered = useMemo(() => expenses.filter(e => {
    if (search && !e.description?.includes(search) &&
        !e.category_name.includes(search) &&
        !e.reference_number?.includes(search)) return false
    if (filterCat   && e.category_id !== filterCat) return false
    if (filterMonth && !e.expense_date.startsWith(filterMonth)) return false
    return true
  }), [expenses, search, filterCat, filterMonth])

  const filteredTotal = filtered.reduce((s, e) => s + e.amount, 0)

  async function handleDelete(exp: ExpenseView) {
    setDeleting(exp.id)
    try { await deleteExpense.mutateAsync(exp.id) }
    finally { setDeleting(null); setConfirmDel(null) }
  }

  const kpi = [
    { label: 'إجمالي المصروفات',   value: `${fmt(stats?.total ?? 0)} ج`,       color: 'red'    as const, icon: TrendingDown, sub: `${expenses.length} عملية` },
    { label: 'مصروفات هذا الشهر', value: `${fmt(stats?.thisMonth ?? 0)} ج`,   color: 'amber'  as const, icon: Calendar,    sub: stats?.lastMonth ? `الشهر الماضي: ${fmt(stats.lastMonth)} ج` : undefined },
    { label: 'أكبر فئة إنفاق',    value: stats?.byCategory[0]?.category_name ?? '—', color: 'purple' as const, icon: Receipt,    sub: stats?.byCategory[0] ? `${fmt(stats.byCategory[0].total)} ج` : undefined },
    { label: 'إجمالي المعروض',     value: `${fmt(filteredTotal)} ج`,            color: 'blue'   as const, icon: Wallet,     sub: `${filtered.length} من ${expenses.length}` },
  ]
  const colorMap = {
    red:    { bg: 'bg-red-50    dark:bg-red-900/20',    ic: 'text-red-500',    bd: 'border-red-100    dark:border-red-900'    },
    amber:  { bg: 'bg-amber-50  dark:bg-amber-900/20',  ic: 'text-amber-500',  bd: 'border-amber-100  dark:border-amber-900'  },
    purple: { bg: 'bg-purple-50 dark:bg-purple-900/20', ic: 'text-purple-500', bd: 'border-purple-100 dark:border-purple-900' },
    blue:   { bg: 'bg-blue-50   dark:bg-blue-900/20',   ic: 'text-blue-500',   bd: 'border-blue-100   dark:border-blue-900'   },
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">إدارة المصروفات</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">تتبع وتسجيل مصروفات المحل</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="h-10 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold flex items-center gap-2 transition-colors shadow-lg shadow-red-600/20">
          <Plus size={16} /> إضافة مصروف
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpi.map(({ label, value, color, icon: Icon, sub }) => {
          const c = colorMap[color]
          return (
            <div key={label} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{label}</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white mt-1 leading-tight truncate">{value}</p>
                  {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 truncate">{sub}</p>}
                </div>
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border', c.bg, c.bd)}>
                  <Icon size={18} className={c.ic} />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {(stats?.byCategory.length ?? 0) > 0 && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
          <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4">توزيع المصروفات بالفئة</p>
          <div className="space-y-3">
            {stats!.byCategory.slice(0, 6).map(c => {
              const pct = stats!.total > 0 ? (c.total / stats!.total) * 100 : 0
              return (
                <div key={c.category_name}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-gray-700 dark:text-gray-300">{c.category_name}</span>
                    <span className="text-gray-500 dark:text-gray-400">{fmt(c.total)} ج ({pct.toFixed(0)}%)</span>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-red-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="بحث في الوصف أو الفئة..."
            className="h-9 w-full border border-gray-200 dark:border-gray-700 rounded-xl pr-9 pl-3 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-blue-500 transition-all" />
        </div>
        <div className="relative">
          <ChevronDown size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
            className="h-9 border border-gray-200 dark:border-gray-700 rounded-xl pr-3 pl-7 text-sm bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:border-blue-500 cursor-pointer appearance-none">
            <option value="">كل الفئات</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="relative">
          <ChevronDown size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
            className="h-9 border border-gray-200 dark:border-gray-700 rounded-xl pr-3 pl-7 text-sm bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:border-blue-500 cursor-pointer appearance-none">
            <option value="">كل الأشهر</option>
            {months.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        {(search || filterCat || filterMonth) && (
          <button onClick={() => { setSearch(''); setFilterCat(''); setFilterMonth('') }}
            className="h-9 px-3 rounded-xl border border-gray-200 dark:border-gray-700 text-xs text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-1 transition-colors">
            <X size={12} /> مسح
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                {['التاريخ', 'الفئة', 'الوصف', 'المرجع', 'طريقة الدفع', 'المبلغ', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-right text-xs font-bold text-gray-500 dark:text-gray-400 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {isLoading ? Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: 7 }).map((_, j) => (
                  <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" /></td>
                ))}</tr>
              )) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-gray-400 dark:text-gray-600">
                      <Receipt size={32} className="opacity-30" />
                      <p className="text-sm font-medium">لا توجد مصروفات</p>
                      <button onClick={() => setShowModal(true)} className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline">
                        إضافة أول مصروف
                      </button>
                    </div>
                  </td>
                </tr>
              ) : filtered.map(exp => (
                <tr key={exp.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(exp.expense_date).toLocaleDateString('ar-EG')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-xs font-semibold">
                      {exp.category_name}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300 max-w-48 truncate">{exp.description ?? '—'}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-400">{exp.reference_number ?? '—'}</td>
                  <td className="px-4 py-3">
                    <Badge variant={METHOD_COLORS[exp.payment_method] ?? 'neutral'}>
                      {METHOD_LABELS[exp.payment_method] ?? exp.payment_method}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-bold text-red-600 dark:text-red-400 whitespace-nowrap">{fmt(exp.amount)} ج</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setEditing(exp)}
                        className="w-7 h-7 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-400 hover:text-blue-600 hover:border-blue-300 transition-colors">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => setConfirmDel(exp)} disabled={deleting === exp.id}
                        className="w-7 h-7 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-400 hover:text-red-600 hover:border-red-300 transition-colors disabled:opacity-50">
                        {deleting === exp.id
                          ? <span className="w-3 h-3 border border-red-400/30 border-t-red-500 rounded-full animate-spin" />
                          : <Trash2 size={13} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            {filtered.length > 0 && (
              <tfoot>
                <tr className="bg-red-50 dark:bg-red-900/10 border-t-2 border-red-200 dark:border-red-800">
                  <td colSpan={5} className="px-4 py-3 text-xs font-bold text-red-700 dark:text-red-400">
                    إجمالي المعروض ({filtered.length} مصروف)
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-red-600 dark:text-red-400 whitespace-nowrap">{fmt(filteredTotal)} ج</td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {showModal   && <ExpenseModal onClose={() => setShowModal(false)} />}
      {editing     && <ExpenseModal expense={editing} onClose={() => setEditing(null)} />}
      {confirmDel  && (
        <ConfirmModal
          title="حذف المصروف"
          message={`هل أنت متأكد من حذف هذا المصروف?
${confirmDel.description ?? confirmDel.category_name} — ${fmt(confirmDel.amount)} ج`}
          confirmText="حذف"
          loading={deleting === confirmDel.id}
          onConfirm={() => void handleDelete(confirmDel)}
          onCancel={() => setConfirmDel(null)}
        />
      )}
    </div>
  )
}
