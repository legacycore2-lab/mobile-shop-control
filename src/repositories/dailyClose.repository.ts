// src/repositories/dailyClose.repository.ts
import { supabase } from '@/lib/supabase'

const n = (v: unknown): number => Number(v ?? 0)

const ID_CHUNK = 100

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

export interface SaleInvoiceRow {
  id:           string
  customer_id:  string | null
  total_amount: number
  paid_amount:  number
  discount:     number
}

export interface SaleCostLine {
  invoice_id: string
  quantity:   number
  unit_cost:  number
}

export interface PurchaseInvoiceRow {
  id:           string
  total_amount: number
}

export interface PaymentRow {
  payment_type:   'sale' | 'purchase'
  invoice_id:     string
  amount:         number
  payment_method: string
}

export interface InvoiceRefRow {
  id:           string
  status:       string
  invoice_date: string
}

export interface ExpenseRow {
  amount:         number
  payment_method: string
  category_name:  string
}

export const dailyCloseRepository = {

  getConfirmedSaleInvoices: async (date: string): Promise<SaleInvoiceRow[]> => {
    const { data, error } = await supabase
      .from('sale_invoices')
      .select('id, customer_id, total_amount, paid_amount, discount')
      .eq('invoice_date', date)
      .eq('status', 'confirmed')
      .limit(2000)
    if (error) throw error
    return ((data ?? []) as Record<string, unknown>[]).map(r => ({
      id:           String(r['id']),
      customer_id:  (r['customer_id'] as string | null) ?? null,
      total_amount: n(r['total_amount']),
      paid_amount:  n(r['paid_amount']),
      discount:     n(r['discount']),
    }))
  },

  getSaleCostLines: async (invoiceIds: string[]): Promise<SaleCostLine[]> => {
    const lines: SaleCostLine[] = []

    for (const ids of chunk(invoiceIds, ID_CHUNK)) {
      const [devices, products] = await Promise.all([
        supabase
          .from('sale_invoice_devices')
          .select('invoice_id, mobile_devices!device_id ( cost_price )')
          .in('invoice_id', ids),
        supabase
          .from('sale_invoice_products')
          .select('invoice_id, quantity, products!product_id ( cost_price )')
          .in('invoice_id', ids),
      ])
      if (devices.error)  throw devices.error
      if (products.error) throw products.error

      for (const row of (devices.data ?? []) as unknown[]) {
        const r   = row as Record<string, unknown>
        const dev = r['mobile_devices'] as Record<string, unknown> | null
        lines.push({ invoice_id: String(r['invoice_id']), quantity: 1, unit_cost: n(dev?.['cost_price']) })
      }
      for (const row of (products.data ?? []) as unknown[]) {
        const r   = row as Record<string, unknown>
        const prd = r['products'] as Record<string, unknown> | null
        lines.push({ invoice_id: String(r['invoice_id']), quantity: n(r['quantity']), unit_cost: n(prd?.['cost_price']) })
      }
    }
    return lines
  },

  getConfirmedPurchaseInvoices: async (date: string): Promise<PurchaseInvoiceRow[]> => {
    const { data, error } = await supabase
      .from('purchase_invoices')
      .select('id, total_amount')
      .eq('invoice_date', date)
      .eq('status', 'confirmed')
      .limit(2000)
    if (error) throw error
    return ((data ?? []) as Record<string, unknown>[]).map(r => ({
      id:           String(r['id']),
      total_amount: n(r['total_amount']),
    }))
  },

  getPaymentsByDate: async (date: string): Promise<PaymentRow[]> => {
    const { data, error } = await supabase
      .from('payments')
      .select('payment_type, invoice_id, amount, payment_method')
      .eq('payment_date', date)
      .limit(2000)
    if (error) throw error
    return ((data ?? []) as Record<string, unknown>[]).map(r => ({
      payment_type:   r['payment_type'] as 'sale' | 'purchase',
      invoice_id:     String(r['invoice_id']),
      amount:         n(r['amount']),
      payment_method: String(r['payment_method'] ?? 'cash'),
    }))
  },

  getSaleInvoiceRefs: async (ids: string[]): Promise<InvoiceRefRow[]> => {
    const rows: InvoiceRefRow[] = []
    for (const part of chunk(ids, ID_CHUNK)) {
      const { data, error } = await supabase
        .from('sale_invoices')
        .select('id, status, invoice_date')
        .in('id', part)
      if (error) throw error
      rows.push(...((data ?? []) as InvoiceRefRow[]))
    }
    return rows
  },

  getPurchaseInvoiceRefs: async (ids: string[]): Promise<InvoiceRefRow[]> => {
    const rows: InvoiceRefRow[] = []
    for (const part of chunk(ids, ID_CHUNK)) {
      const { data, error } = await supabase
        .from('purchase_invoices')
        .select('id, status, invoice_date')
        .in('id', part)
      if (error) throw error
      rows.push(...((data ?? []) as InvoiceRefRow[]))
    }
    return rows
  },

  getExpensesByDate: async (date: string): Promise<ExpenseRow[]> => {
    const { data, error } = await supabase
      .from('expenses')
      .select('amount, payment_method, expense_categories!category_id ( name )')
      .eq('expense_date', date)
      .limit(2000)
    if (error) throw error
    return ((data ?? []) as unknown[]).map(row => {
      const r   = row as Record<string, unknown>
      const cat = r['expense_categories'] as Record<string, unknown> | null
      return {
        amount:         n(r['amount']),
        payment_method: String(r['payment_method'] ?? 'cash'),
        category_name:  String(cat?.['name'] ?? 'بدون بند'),
      }
    })
  },
}
