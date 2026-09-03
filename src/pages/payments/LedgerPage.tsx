// src/pages/payments/LedgerPage.tsx
import { useState, useMemo } from 'react'
import { Search, TrendingDown, TrendingUp, Users, Truck, DollarSign, CreditCard, ExternalLink } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useSupplierLedger, useCustomerLedger } from '@/hooks/usePayments'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/cn'
import { fmt } from '@/lib/fmt'
import type { SupplierLedger, CustomerLedger } from '@/types/database'

const METHOD_LABELS: Record<string, string> = {
  cash: 'نقدي', bank_transfer: 'تحويل بنكي', check: 'شيك', other: 'أخرى',
}


// ── Supplier Ledger Table ─────────────────────────────────────────────────────

function SupplierLedgerTable({ search }: { search: string }) {
  const { data: ledger = [], isLoading } = useSupplierLedger()
  const navigate = useNavigate()

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return ledger.filter(s => !q || s.supplier_name.toLowerCase().includes(q))
  }, [ledger, search])

  if (isLoading) return (
    <div className="py-12 text-center text-gray-400 dark:text-gray-600 text-sm">جاري التحميل...</div>
  )

  if (filtered.length === 0) return (
    <div className="py-12 text-center text-gray-400 dark:text-gray-600 text-sm">لا توجد موردين</div>
  )

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
            {['المورد', 'رصيد افتتاحي', 'إجمالي الفواتير', 'إجمالي المدفوع', 'الرصيد المتبقي', ''].map(h => (
              <th key={h} className="px-4 py-3 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {filtered.map(s => (
            <tr key={s.supplier_id}
              className="bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
              onClick={() => navigate(`/ledger/supplier/${s.supplier_id}`)}>
              <td className="px-4 py-3">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">{s.supplier_name}</p>
                  {s.supplier_phone && <p className="text-xs text-gray-400 dark:text-gray-600">{s.supplier_phone}</p>}
                </div>
              </td>
              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{fmt(s.opening_balance)} ج</td>
              <td className="px-4 py-3 text-sm font-medium text-red-600 dark:text-red-400">{fmt(s.total_invoiced)} ج</td>
              <td className="px-4 py-3 text-sm font-medium text-green-600 dark:text-green-400">{fmt(s.total_paid)} ج</td>
              <td className="px-4 py-3">
                <span className={cn(
                  'inline-flex items-center px-2.5 py-1 rounded-lg text-sm font-bold',
                  s.balance > 0
                    ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                    : 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                )}>
                  {fmt(Math.abs(s.balance))} ج
                  {s.balance > 0 ? ' (مديونية)' : ' (مسدد)'}
                </span>
              </td>
              <td className="px-4 py-3 text-gray-400">
                <ExternalLink size={14} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Customer Ledger Table ─────────────────────────────────────────────────────

function CustomerLedgerTable({ search }: { search: string }) {
  const { data: ledger = [], isLoading } = useCustomerLedger()
  const navigate = useNavigate()

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return ledger.filter(c => !q || c.customer_name.toLowerCase().includes(q))
  }, [ledger, search])

  if (isLoading) return (
    <div className="py-12 text-center text-gray-400 dark:text-gray-600 text-sm">جاري التحميل...</div>
  )

  if (filtered.length === 0) return (
    <div className="py-12 text-center text-gray-400 dark:text-gray-600 text-sm">لا توجد عملاء</div>
  )

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
            {['العميل', 'رصيد افتتاحي', 'إجمالي المبيعات', 'إجمالي المدفوع', 'الرصيد المتبقي', ''].map(h => (
              <th key={h} className="px-4 py-3 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {filtered.map(c => (
            <tr key={c.customer_id}
              className="bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
              onClick={() => navigate(`/ledger/customer/${c.customer_id}`)}>
              <td className="px-4 py-3">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">{c.customer_name}</p>
                  {c.customer_phone && <p className="text-xs text-gray-400 dark:text-gray-600">{c.customer_phone}</p>}
                </div>
              </td>
              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{fmt(c.opening_balance)} ج</td>
              <td className="px-4 py-3 text-sm font-medium text-blue-600 dark:text-blue-400">{fmt(c.total_invoiced)} ج</td>
              <td className="px-4 py-3 text-sm font-medium text-green-600 dark:text-green-400">{fmt(c.total_paid)} ج</td>
              <td className="px-4 py-3">
                <span className={cn(
                  'inline-flex items-center px-2.5 py-1 rounded-lg text-sm font-bold',
                  c.balance > 0
                    ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'
                    : 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                )}>
                  {fmt(Math.abs(c.balance))} ج
                  {c.balance > 0 ? ' (مديونية)' : ' (مسدد)'}
                </span>
              </td>
              <td className="px-4 py-3 text-gray-400">
                <ExternalLink size={14} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function LedgerPage() {
  const [tab,    setTab]    = useState<'suppliers' | 'customers'>('suppliers')
  const [search, setSearch] = useState('')

  const { data: supplierLedger = [] } = useSupplierLedger()
  const { data: customerLedger = [] } = useCustomerLedger()

  const supplierDebt  = supplierLedger.filter(s => s.balance > 0).reduce((s, r) => s + Number(r.balance), 0)
  const customerDebt  = customerLedger.filter(c => c.balance > 0).reduce((s, r) => s + Number(r.balance), 0)
  const suppliersOwed = supplierLedger.filter(s => s.balance > 0).length
  const customersOwed = customerLedger.filter(c => c.balance > 0).length

  return (
    <div className="space-y-6" dir="rtl">

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">الحسابات والمديونيات</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">كشف حساب الموردين والعملاء</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'مديونية الموردين', value: supplierDebt, sub: `${suppliersOwed} مورد بمديونية`, icon: TrendingDown, color: 'red' },
          { label: 'مديونية العملاء',  value: customerDebt, sub: `${customersOwed} عميل بمديونية`,  icon: TrendingUp,   color: 'amber' },
          { label: 'إجمالي الموردين',  value: supplierLedger.length, sub: 'مورد مسجل', icon: Truck,   color: 'blue', isCount: true },
          { label: 'إجمالي العملاء',   value: customerLedger.length, sub: 'عميل مسجل',  icon: Users,  color: 'purple', isCount: true },
        ].map(({ label, value, sub, icon: Icon, color, isCount }) => {
          const C: Record<string, string> = {
            red:    'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-100 dark:border-red-900',
            amber:  'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900',
            blue:   'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900',
            purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-purple-100 dark:border-purple-900',
          }
          return (
            <div key={label} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{label}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {isCount ? value : `${fmt(value as number)} ج`}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{sub}</p>
                </div>
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border', C[color])}>
                  <Icon size={18} />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Tabs + Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          {([
            ['suppliers', 'الموردين',  Truck ],
            ['customers', 'العملاء',   Users ],
          ] as const).map(([v, l, Icon]) => (
            <button key={v} onClick={() => { setTab(v); setSearch('') }}
              className={cn(
                'flex items-center gap-2 h-8 px-4 text-sm font-medium rounded-md transition-all',
                tab === v
                  ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              )}>
              <Icon size={14} /> {l}
            </button>
          ))}
        </div>

        <div className="relative flex-1 min-w-0 sm:max-w-xs">
          <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder={tab === 'suppliers' ? 'بحث في الموردين...' : 'بحث في العملاء...'}
            className="w-full h-9 pr-9 pl-3 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all" />
        </div>
      </div>

      {/* Ledger table */}
      {tab === 'suppliers'
        ? <SupplierLedgerTable search={search} />
        : <CustomerLedgerTable search={search} />
      }

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-gray-400 dark:text-gray-600 pt-2 border-t border-gray-100 dark:border-gray-800">
        <span>اضغط على أي صف لعرض سجل المدفوعات</span>
        <span className="flex items-center gap-1"><CreditCard size={12} /> المدفوعات المسجلة قابلة للحذف</span>
        <span className="flex items-center gap-1"><DollarSign size={12} /> لإضافة دفعة — افتح تفاصيل الفاتورة من المشتريات أو نقطة البيع</span>
      </div>
    </div>
  )
}
