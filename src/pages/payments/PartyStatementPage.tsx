// src/pages/payments/PartyStatementPage.tsx
import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowRight, Printer, DollarSign, FileText,
  TrendingDown, TrendingUp, Truck, Users,
  CheckCircle, AlertCircle,
} from 'lucide-react'
import { useSupplierLedgerById, useCustomerLedgerById, usePaymentsByParty } from '@/hooks/usePayments'
import { useQuery } from '@tanstack/react-query'
import { paymentsService } from '@/services/payments.service'
import { AddPaymentModal } from './AddPaymentModal'
import { cn } from '@/lib/cn'
import { fmt } from '@/lib/fmt'

const METHOD_LABELS: Record<string, string> = {
  cash: 'نقدي', bank_transfer: 'تحويل بنكي', check: 'شيك', other: 'أخرى',
}

// ── Invoice type for both purchase and sale ───────────────────────────────────
interface InvoiceRow {
  id:             string
  invoice_number: string
  invoice_date:   string
  total_amount:   number
  paid_amount:    number
  discount:       number
  remaining:      number
  status:         string
  notes:          string | null
}

// ── Print function ────────────────────────────────────────────────────────────
function printStatement(opts: {
  partyName:    string
  partyPhone:   string | null
  partyType:    'supplier' | 'customer'
  openingBal:   number
  totalInvoiced: number
  totalPaid:    number
  balance:      number
  invoices:     InvoiceRow[]
  payments:     { invoice_number: string; amount: number; payment_method: string; payment_date: string; notes: string | null }[]
}) {
  const { partyName, partyPhone, partyType, openingBal, totalInvoiced, totalPaid, balance, invoices, payments } = opts
  const isSupplier = partyType === 'supplier'
  const today = new Date().toLocaleDateString('ar-EG')

  const html = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>كشف حساب — ${partyName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; font-size: 13px; color: #1a1a1a; background: #fff; direction: rtl; }
    .page { padding: 24px 32px; max-width: 900px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #1d4ed8; padding-bottom: 16px; margin-bottom: 20px; }
    .header-title h1 { font-size: 22px; font-weight: 800; color: #1d4ed8; }
    .header-title p { color: #6b7280; font-size: 12px; margin-top: 4px; }
    .header-info { text-align: left; }
    .header-info p { font-size: 12px; color: #374151; margin-bottom: 2px; }
    .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
    .summary-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; }
    .summary-card .label { font-size: 11px; color: #6b7280; margin-bottom: 4px; }
    .summary-card .value { font-size: 18px; font-weight: 800; color: #1a1a1a; }
    .summary-card.balance-due    .value { color: #dc2626; }
    .summary-card.balance-ok     .value { color: #16a34a; }
    .summary-card.balance-credit  .value { color: #2563eb; }
    .section-title { font-size: 14px; font-weight: 700; color: #1d4ed8; border-bottom: 1px solid #dbeafe; padding-bottom: 6px; margin-bottom: 12px; margin-top: 20px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th { background: #eff6ff; color: #1d4ed8; font-weight: 700; padding: 8px 10px; text-align: right; border: 1px solid #bfdbfe; }
    td { padding: 7px 10px; border: 1px solid #e5e7eb; vertical-align: middle; }
    tr:nth-child(even) td { background: #f9fafb; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 99px; font-size: 11px; font-weight: 600; }
    .badge-red  { background: #fee2e2; color: #dc2626; }
    .badge-green { background: #dcfce7; color: #16a34a; }
    .balance-row { background: #eff6ff !important; font-weight: 700; }
    .balance-row td { border-top: 2px solid #1d4ed8; }
    .footer { margin-top: 32px; border-top: 1px solid #e5e7eb; padding-top: 12px; display: flex; justify-content: space-between; color: #9ca3af; font-size: 11px; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
<div class="page">

  <div class="header">
    <div class="header-title">
      <h1>كشف حساب ${isSupplier ? 'مورد' : 'عميل'}</h1>
      <p>Mobile Shop Control — نظام إدارة المحل</p>
    </div>
    <div class="header-info">
      <p><strong>${partyName}</strong></p>
      ${partyPhone ? `<p>📞 ${partyPhone}</p>` : ''}
      <p>📅 تاريخ الطباعة: ${today}</p>
    </div>
  </div>

  <div class="summary">
    <div class="summary-card">
      <div class="label">رصيد افتتاحي</div>
      <div class="value">${fmt(openingBal)} ج</div>
    </div>
    <div class="summary-card">
      <div class="label">${isSupplier ? 'إجمالي المشتريات' : 'إجمالي المبيعات'}</div>
      <div class="value">${fmt(totalInvoiced)} ج</div>
    </div>
    <div class="summary-card">
      <div class="label">إجمالي المدفوع</div>
      <div class="value">${fmt(totalPaid)} ج</div>
    </div>
    <div class="summary-card ${balance > 0 ? 'balance-due' : balance < 0 ? 'balance-credit' : 'balance-ok'}">
      <div class="label">الرصيد المتبقي</div>
      <div class="value">${fmt(Math.abs(balance))} ج ${balance > 0 ? '(مديونية)' : balance < 0 ? '(رصيد دائن)' : '(مسدد)'}</div>
    </div>
  </div>

  <div class="section-title">📋 الفواتير</div>
  <table>
    <thead>
      <tr>
        <th>رقم الفاتورة</th>
        <th>التاريخ</th>
        <th>الإجمالي</th>
        <th>الخصم</th>
        <th>المدفوع</th>
        <th>المتبقي</th>
      </tr>
    </thead>
    <tbody>
      ${invoices.map(inv => `
        <tr>
          <td><strong>${inv.invoice_number}</strong></td>
          <td>${new Date(inv.invoice_date).toLocaleDateString('ar-EG')}</td>
          <td>${fmt(inv.total_amount)} ج</td>
          <td>${inv.discount > 0 ? fmt(inv.discount) + ' ج' : '—'}</td>
          <td>${fmt(inv.paid_amount)} ج</td>
          <td>
            <span class="badge ${inv.remaining > 0 ? 'badge-red' : 'badge-green'}">
              ${fmt(inv.remaining)} ج
            </span>
          </td>
        </tr>
      `).join('')}
      <tr class="balance-row">
        <td colspan="2"><strong>الإجمالي</strong></td>
        <td><strong>${fmt(invoices.reduce((s,i) => s + i.total_amount, 0))} ج</strong></td>
        <td><strong>${fmt(invoices.reduce((s,i) => s + i.discount, 0))} ج</strong></td>
        <td><strong>${fmt(invoices.reduce((s,i) => s + i.paid_amount, 0))} ج</strong></td>
        <td><strong>${fmt(invoices.reduce((s,i) => s + i.remaining, 0))} ج</strong></td>
      </tr>
    </tbody>
  </table>

  ${payments.length > 0 ? `
  <div class="section-title">💰 سجل المدفوعات</div>
  <table>
    <thead>
      <tr>
        <th>رقم الفاتورة</th>
        <th>التاريخ</th>
        <th>طريقة الدفع</th>
        <th>ملاحظات</th>
        <th>المبلغ</th>
      </tr>
    </thead>
    <tbody>
      ${payments.map(p => `
        <tr>
          <td>${p.invoice_number}</td>
          <td>${new Date(p.payment_date).toLocaleDateString('ar-EG')}</td>
          <td>${METHOD_LABELS[p.payment_method] ?? p.payment_method}</td>
          <td>${p.notes ?? '—'}</td>
          <td><strong>${fmt(p.amount)} ج</strong></td>
        </tr>
      `).join('')}
      <tr class="balance-row">
        <td colspan="4"><strong>إجمالي المدفوعات</strong></td>
        <td><strong>${fmt(payments.reduce((s,p) => s + p.amount, 0))} ج</strong></td>
      </tr>
    </tbody>
  </table>
  ` : ''}

  <div class="footer">
    <span>Mobile Shop Control — نظام إدارة المحل</span>
    <span>كشف حساب ${partyName} — ${today}</span>
  </div>

</div>
<script>window.onload = () => window.print()</script>
</body>
</html>`

  const win = window.open('', '_blank')
  if (win) { win.document.write(html); win.document.close() }
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function PartyStatementPage() {
  const { type, id } = useParams<{ type: string; id: string }>()
  const navigate      = useNavigate()
  const isSupplier    = type === 'supplier'

  const { data: supplierLedger } = useSupplierLedgerById(isSupplier ? (id ?? '') : '')
  const { data: customerLedger } = useCustomerLedgerById(!isSupplier ? (id ?? '') : '')
  const { data: payments = [] }  = usePaymentsByParty(id ?? '')

  const { data: invoices = [] } = useQuery({
    queryKey: ['statement-invoices', type, id],
    queryFn: () => isSupplier
      ? paymentsService.getPurchaseInvoicesBySupplier(id ?? '')
      : paymentsService.getSaleInvoicesByCustomer(id ?? ''),
    enabled: !!id,
  })

  const ledger = isSupplier ? supplierLedger : customerLedger
  const partyName  = isSupplier ? (supplierLedger?.supplier_name ?? '...') : (customerLedger?.customer_name ?? '...')
  const partyPhone = isSupplier ? supplierLedger?.supplier_phone : customerLedger?.customer_phone

  const [payModal, setPayModal] = useState<{ invoiceId: string; invoiceNumber: string; remaining: number } | null>(null)

  const totalInvoiceRemaining = useMemo(() =>
    invoices.reduce((s, i) => s + i.remaining, 0), [invoices])

  if (!ledger) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const openingBal   = Number(ledger.opening_balance)
  const totalInvoiced = Number(ledger.total_invoiced)
  const totalPaid    = Number(ledger.total_paid)
  const balance      = Number(ledger.balance)

  return (
    <div className="space-y-6" dir="rtl">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/ledger')}
            className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <ArrowRight size={16} />
          </button>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-50 dark:bg-blue-900/20">
            {isSupplier ? <Truck size={18} className="text-blue-600" /> : <Users size={18} className="text-blue-600" />}
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">{partyName}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {partyPhone ?? ''} — كشف حساب {isSupplier ? 'مورد' : 'عميل'}
            </p>
          </div>
        </div>
        <button
          onClick={() => printStatement({
            partyName, partyPhone: partyPhone ?? null,
            partyType: isSupplier ? 'supplier' : 'customer',
            openingBal, totalInvoiced, totalPaid, balance,
            invoices,
            payments: payments.map((p: {invoice_number:string;amount:number;payment_method:string;payment_date:string;notes:string|null}) => ({
              invoice_number: p.invoice_number,
              amount: Number(p.amount),
              payment_method: p.payment_method,
              payment_date: p.payment_date,
              notes: p.notes,
            })),
          })}
          className="flex items-center gap-2 h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors">
          <Printer size={14} /> طباعة PDF
        </button>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'رصيد افتتاحي',   value: openingBal,    color: 'gray' },
          { label: isSupplier ? 'إجمالي المشتريات' : 'إجمالي المبيعات', value: totalInvoiced, color: 'blue' },
          { label: 'إجمالي المدفوع', value: totalPaid,     color: 'green' },
          { label: 'الرصيد المتبقي', value: balance,       color: balance > 0 ? 'red' : balance < 0 ? 'blue' : 'green' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
            <p className={cn('text-2xl font-bold mt-1',
              color === 'red'   ? 'text-red-600 dark:text-red-400' :
              color === 'green' ? 'text-green-600 dark:text-green-400' :
              color === 'blue'  ? 'text-blue-600 dark:text-blue-400' :
              'text-gray-900 dark:text-white'
            )}>
              {fmt(Math.abs(value))} ج
            </p>
            {label === 'الرصيد المتبقي' && (
              <p className={cn('text-xs mt-1', value > 0 ? 'text-red-500' : 'text-green-500')}>
                {value > 0 ? 'مديونية' : value < 0 ? '★ رصيد دائن — سيُخصم من الفواتير القادمة' : 'مسدد بالكامل ✓'}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Invoices Table */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-blue-600" />
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">الفواتير</h2>
            <span className="text-xs text-gray-400">({invoices.length})</span>
          </div>
          {totalInvoiceRemaining > 0 && (
            <span className="text-xs font-bold text-red-600 dark:text-red-400">
              إجمالي المتبقي: {fmt(totalInvoiceRemaining)} ج
            </span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                {['رقم الفاتورة', 'التاريخ', 'الإجمالي', 'الخصم', 'المدفوع', 'المتبقي', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-right text-xs font-bold text-gray-500 dark:text-gray-400 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {invoices.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">لا توجد فواتير مؤكدة</td></tr>
              ) : invoices.map(inv => (
                <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs font-bold text-gray-700 dark:text-gray-300">{inv.invoice_number}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{new Date(inv.invoice_date).toLocaleDateString('ar-EG')}</td>
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{fmt(inv.total_amount)} ج</td>
                  <td className="px-4 py-3 text-gray-400">{inv.discount > 0 ? `${fmt(inv.discount)} ج` : '—'}</td>
                  <td className="px-4 py-3 text-green-600 dark:text-green-400 font-medium">{fmt(inv.paid_amount)} ج</td>
                  <td className="px-4 py-3">
                    <span className={cn('inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold',
                      inv.remaining > 0
                        ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                        : 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                    )}>
                      {inv.remaining > 0 ? <AlertCircle size={10} /> : <CheckCircle size={10} />}
                      {fmt(inv.remaining)} ج
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {inv.remaining > 0 && (
                      <button
                        onClick={() => setPayModal({ invoiceId: inv.id, invoiceNumber: inv.invoice_number, remaining: inv.remaining })}
                        className="h-7 px-2.5 rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 text-xs font-semibold text-green-700 dark:text-green-400 hover:bg-green-100 transition-colors flex items-center gap-1 whitespace-nowrap">
                        <DollarSign size={11} /> دفع
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            {invoices.length > 0 && (
              <tfoot>
                <tr className="bg-blue-50 dark:bg-blue-900/10 border-t-2 border-blue-200 dark:border-blue-800">
                  <td className="px-4 py-3 text-xs font-bold text-blue-700 dark:text-blue-400" colSpan={2}>الإجمالي</td>
                  <td className="px-4 py-3 text-sm font-bold text-gray-900 dark:text-white">{fmt(invoices.reduce((s,i)=>s+i.total_amount,0))} ج</td>
                  <td className="px-4 py-3 text-sm font-bold text-gray-500">{fmt(invoices.reduce((s,i)=>s+i.discount,0))} ج</td>
                  <td className="px-4 py-3 text-sm font-bold text-green-600">{fmt(invoices.reduce((s,i)=>s+i.paid_amount,0))} ج</td>
                  <td className="px-4 py-3 text-sm font-bold text-red-600">{fmt(totalInvoiceRemaining)} ج</td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
          <DollarSign size={16} className="text-green-600" />
          <h2 className="text-sm font-bold text-gray-900 dark:text-white">سجل المدفوعات</h2>
          <span className="text-xs text-gray-400">({payments.length})</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                {['رقم الفاتورة', 'التاريخ', 'طريقة الدفع', 'ملاحظات', 'المبلغ'].map(h => (
                  <th key={h} className="px-4 py-3 text-right text-xs font-bold text-gray-500 dark:text-gray-400 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {payments.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400">لا توجد مدفوعات مسجلة</td></tr>
              ) : payments.map(p => (
                <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.invoice_number}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{new Date(p.payment_date).toLocaleDateString('ar-EG')}</td>
                  <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400">{METHOD_LABELS[p.payment_method] ?? p.payment_method}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">{p.notes ?? '—'}</td>
                  <td className="px-4 py-3 font-bold text-green-600 dark:text-green-400">{fmt(p.amount)} ج</td>
                </tr>
              ))}
            </tbody>
            {payments.length > 0 && (
              <tfoot>
                <tr className="bg-green-50 dark:bg-green-900/10 border-t-2 border-green-200 dark:border-green-800">
                  <td className="px-4 py-3 text-xs font-bold text-green-700 dark:text-green-400" colSpan={4}>إجمالي المدفوعات</td>
                  <td className="px-4 py-3 text-sm font-bold text-green-600">{fmt(payments.reduce((s,p)=>s+Number(p.amount),0))} ج</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Add Payment Modal */}
      {payModal && (
        <AddPaymentModal
          invoiceId={payModal.invoiceId}
          invoiceNumber={payModal.invoiceNumber}
          partyId={id ?? ''}
          partyName={partyName}
          partyType={isSupplier ? 'supplier' : 'customer'}
          paymentType={isSupplier ? 'purchase' : 'sale'}
          remaining={payModal.remaining}
          onClose={() => setPayModal(null)}
        />
      )}
    </div>
  )
}

