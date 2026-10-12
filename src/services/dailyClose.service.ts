// src/services/dailyClose.service.ts
import {
  dailyCloseRepository,
  type SaleInvoiceRow, type SaleLine, type PurchaseInvoiceRow,
  type PaymentRow, type InvoiceRefRow, type ExpenseRow,
} from '@/repositories/dailyClose.repository'
import { paymentsRepository } from '@/repositories/payments.repository'
import { CASH_METHOD_ORDER, toCashMethod } from '@/constants/paymentMethods'
import type { CustomerLedger, SupplierLedger } from '@/types/database'
import type {
  CashMethod, CashMethodRow, CreditorRow, DailyClose, DebtorRow, ExpenseCategoryRow, SoldItemRow,
} from '@/types/dailyClose'

const TOP_DEBTORS = 5

export interface DailyCloseInput {
  date:             string
  saleInvoices:     SaleInvoiceRow[]
  saleLines:        SaleLine[]
  purchaseInvoices: PurchaseInvoiceRow[]
  payments:         PaymentRow[]
  saleRefs:         InvoiceRefRow[]
  purchaseRefs:     InvoiceRefRow[]
  expenses:         ExpenseRow[]
  ledger:           CustomerLedger[]
  supplierLedger:   SupplierLedger[]
}

const sum = (values: number[]): number => values.reduce((a, b) => a + b, 0)

function confirmedIds(refs: InvoiceRefRow[]): Set<string> {
  return new Set(refs.filter(r => r.status === 'confirmed').map(r => r.id))
}

// حساب إقفال اليوم من بيانات خام (دالة صافية بدون أي استعلامات)
export function buildDailyClose(input: DailyCloseInput): DailyClose {
  const { date, saleInvoices, saleLines, purchaseInvoices, payments, expenses, ledger, supplierLedger } = input

  // ── المبيعات والأرباح ──
  const revenue     = sum(saleInvoices.map(i => i.total_amount))
  const discount    = sum(saleInvoices.map(i => i.discount))
  const costOfGoods = sum(saleLines.map(l => l.quantity * l.unit_cost))
  const grossProfit = revenue - costOfGoods

  const itemMap = new Map<string, SoldItemRow>()
  for (const l of saleLines) {
    const key = `${l.kind}:${l.name}`
    const cur = itemMap.get(key) ?? { kind: l.kind, name: l.name, quantity: 0, amount: 0 }
    cur.quantity += l.quantity
    cur.amount   += l.quantity * l.unit_price
    itemMap.set(key, cur)
  }
  const items = [...itemMap.values()].sort((a, b) => b.amount - a.amount)
  const kindTotal = (kind: SoldItemRow['kind']) => {
    const rows = items.filter(i => i.kind === kind)
    return { quantity: sum(rows.map(r => r.quantity)), amount: sum(rows.map(r => r.amount)) }
  }

  // ── النقدية ──
  const byMethod = new Map<CashMethod, { cashIn: number; cashOut: number }>(
    CASH_METHOD_ORDER.map(m => [m, { cashIn: 0, cashOut: 0 }]),
  )
  const bucket = (method: string) => byMethod.get(toCashMethod(method))!

  const todaySaleIds     = new Set(saleInvoices.map(i => i.id))
  const confirmedSales   = confirmedIds(input.saleRefs)
  const confirmedBuys    = confirmedIds(input.purchaseRefs)

  let fromTodaySales    = 0
  let fromOlderInvoices = 0
  let toSuppliers       = 0

  for (const p of payments) {
    if (p.payment_type === 'sale') {
      if (!confirmedSales.has(p.invoice_id)) continue
      bucket(p.payment_method).cashIn += p.amount
      if (todaySaleIds.has(p.invoice_id)) fromTodaySales += p.amount
      else fromOlderInvoices += p.amount
    } else {
      if (!confirmedBuys.has(p.invoice_id)) continue
      bucket(p.payment_method).cashOut += p.amount
      toSuppliers += p.amount
    }
  }

  // البيع النقدي بدون عميل مسجّل: المدفوع بيتسجل على الفاتورة نفسها بدون دفعة
  for (const inv of saleInvoices) {
    if (inv.customer_id !== null) continue
    bucket('cash').cashIn += inv.paid_amount
    fromTodaySales        += inv.paid_amount
  }

  for (const e of expenses) bucket(e.payment_method).cashOut += e.amount

  const methodRows: CashMethodRow[] = CASH_METHOD_ORDER
    .map(method => {
      const v = byMethod.get(method)!
      return { method, cashIn: v.cashIn, cashOut: v.cashOut, net: v.cashIn - v.cashOut }
    })
    .filter(r => r.cashIn !== 0 || r.cashOut !== 0)

  const totalIn  = sum(methodRows.map(r => r.cashIn))
  const totalOut = sum(methodRows.map(r => r.cashOut))

  // ── المصروفات ──
  const categories = new Map<string, number>()
  for (const e of expenses) categories.set(e.category_name, (categories.get(e.category_name) ?? 0) + e.amount)
  const byCategory: ExpenseCategoryRow[] = [...categories.entries()]
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount)
  const expensesTotal = sum(expenses.map(e => e.amount))

  // ── المتبقي عند العملاء ──
  const debtors: DebtorRow[] = ledger
    .filter(l => l.balance > 0)
    .map(l => ({
      customerId: l.customer_id,
      name:       l.customer_name,
      phone:      l.customer_phone,
      balance:    l.balance,
    }))
    .sort((a, b) => b.balance - a.balance)

  const creditors: CreditorRow[] = supplierLedger
    .filter(l => l.balance > 0)
    .map(l => ({ supplierId: l.supplier_id, name: l.supplier_name, phone: l.supplier_phone, balance: l.balance }))
    .sort((a, b) => b.balance - a.balance)

  const newToday = sum(
    saleInvoices
      .filter(i => i.customer_id !== null)
      .map(i => Math.max(0, i.total_amount - i.paid_amount)),
  )

  return {
    date,
    sales: {
      invoiceCount: saleInvoices.length,
      revenue,
      discount,
      costOfGoods,
      grossProfit,
      marginPct: revenue > 0 ? Math.round((grossProfit / revenue) * 1000) / 10 : 0,
      invoices: saleInvoices.map(i => ({
        id:           i.id,
        number:       i.invoice_number,
        customerName: i.customer_name,
        total:        i.total_amount,
        paid:         i.paid_amount,
        remaining:    Math.max(0, i.total_amount - i.paid_amount),
      })),
      items,
      devices:  kindTotal('device'),
      products: kindTotal('product'),
    },
    purchases: {
      invoiceCount: purchaseInvoices.length,
      total:        sum(purchaseInvoices.map(i => i.total_amount)),
      paid:         sum(purchaseInvoices.map(i => i.paid_amount)),
      invoices: purchaseInvoices.map(i => ({
        id:           i.id,
        number:       i.invoice_number,
        supplierName: i.supplier_name,
        total:        i.total_amount,
        paid:         i.paid_amount,
      })),
    },
    cash: {
      totalIn,
      totalOut,
      net: totalIn - totalOut,
      fromTodaySales,
      fromOlderInvoices,
      toSuppliers,
      expenses: expensesTotal,
      byMethod: methodRows,
    },
    expenses: { total: expensesTotal, byCategory },
    netProfit: grossProfit - expensesTotal,
    receivables: {
      totalOutstanding: sum(debtors.map(d => d.balance)),
      debtorCount:      debtors.length,
      newToday,
      topDebtors:       debtors.slice(0, TOP_DEBTORS),
    },
    payables: {
      totalOutstanding: sum(creditors.map(c => c.balance)),
      creditorCount:    creditors.length,
      topCreditors:     creditors.slice(0, TOP_DEBTORS),
    },
  }
}

export const dailyCloseService = {
  get: async (date: string): Promise<DailyClose> => {
    const [saleInvoices, purchaseInvoices, payments, expenses, ledger, supplierLedger] = await Promise.all([
      dailyCloseRepository.getConfirmedSaleInvoices(date),
      dailyCloseRepository.getConfirmedPurchaseInvoices(date),
      dailyCloseRepository.getPaymentsByDate(date),
      dailyCloseRepository.getExpensesByDate(date),
      paymentsRepository.getCustomerLedger(),
      paymentsRepository.getSupplierLedger(),
    ])

    const salePaymentIds     = [...new Set(payments.filter(p => p.payment_type === 'sale').map(p => p.invoice_id))]
    const purchasePaymentIds = [...new Set(payments.filter(p => p.payment_type === 'purchase').map(p => p.invoice_id))]

    const [saleLines, saleRefs, purchaseRefs] = await Promise.all([
      dailyCloseRepository.getSaleLines(saleInvoices.map(i => i.id)),
      dailyCloseRepository.getSaleInvoiceRefs(salePaymentIds),
      dailyCloseRepository.getPurchaseInvoiceRefs(purchasePaymentIds),
    ])

    return buildDailyClose({
      date, saleInvoices, saleLines, purchaseInvoices, payments, saleRefs, purchaseRefs, expenses, ledger, supplierLedger,
    })
  },
}
