// src/repositories/dailyClose.repository.ts
import { supabase } from '@/lib/supabase'
import { invoiceItemNames } from '@/lib/db-helpers'

const n = (v: unknown): number => Number(v ?? 0)

const ID_CHUNK = 100

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

export interface SaleInvoiceRow {
  id:           string
  invoice_number: string
  customer_name:  string | null
  customer_id:  string | null
  total_amount: number
  paid_amount:  number
  discount:     number
}

export interface SaleLine {
  invoice_id: string
  kind:       'device' | 'product'
  name:       string
  quantity:   number
  unit_cost:  number
  unit_price: number
}

export interface PurchaseInvoiceRow {
  id:             string
  invoice_number: string
  supplier_name:  string
  total_amount:   number
  paid_amount:    number
  item_names:     string[]
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
      .select('id, invoice_number, customer_id, total_amount, paid_amount, discount, customers!customer_id ( name )')
      .eq('invoice_date', date)
      .eq('status', 'confirmed')
      .limit(2000)
    if (error) throw error
    return ((data ?? []) as unknown[]).map(row => {
      const r   = row as Record<string, unknown>
      const cus = r['customers'] as Record<string, unknown> | null
      return {
        id:             String(r['id']),
        invoice_number: String(r['invoice_number']),
        customer_name:  cus ? String(cus['name']) : null,
        customer_id:    (r['customer_id'] as string | null) ?? null,
        total_amount:   n(r['total_amount']),
        paid_amount:    n(r['paid_amount']),
        discount:       n(r['discount']),
      }
    })
  },

  getSaleLines: async (invoiceIds: string[]): Promise<SaleLine[]> => {
    const lines: SaleLine[] = []

    for (const ids of chunk(invoiceIds, ID_CHUNK)) {
      const [devices, products] = await Promise.all([
        supabase
          .from('sale_invoice_devices')
          .select(`invoice_id, actual_selling_price,
            mobile_devices!device_id ( cost_price, mobile_models!model_id ( name, mobile_brands!brand_id ( name ) ) )`)
          .in('invoice_id', ids),
        supabase
          .from('sale_invoice_products')
          .select('invoice_id, quantity, unit_price, products!product_id ( name, cost_price )')
          .in('invoice_id', ids),
      ])
      if (devices.error)  throw devices.error
      if (products.error) throw products.error

      for (const row of (devices.data ?? []) as unknown[]) {
        const r     = row as Record<string, unknown>
        const dev   = r['mobile_devices']    as Record<string, unknown> | null
        const model = dev?.['mobile_models'] as Record<string, unknown> | null
        const brand = model?.['mobile_brands'] as Record<string, unknown> | null
        lines.push({
          invoice_id: String(r['invoice_id']),
          kind:       'device',
          name:       `${String(brand?.['name'] ?? '')} ${String(model?.['name'] ?? '—')}`.trim(),
          quantity:   1,
          unit_cost:  n(dev?.['cost_price']),
          unit_price: n(r['actual_selling_price']),
        })
      }
      for (const row of (products.data ?? []) as unknown[]) {
        const r   = row as Record<string, unknown>
        const prd = r['products'] as Record<string, unknown> | null
        lines.push({
          invoice_id: String(r['invoice_id']),
          kind:       'product',
          name:       String(prd?.['name'] ?? '—'),
          quantity:   n(r['quantity']),
          unit_cost:  n(prd?.['cost_price']),
          unit_price: n(r['unit_price']),
        })
      }
    }
    return lines
  },

  getConfirmedPurchaseInvoices: async (date: string): Promise<PurchaseInvoiceRow[]> => {
    const { data, error } = await supabase
      .from('purchase_invoices')
      .select(`id, invoice_number, total_amount, paid_amount, suppliers!supplier_id ( name ),
        devices_agg:purchase_invoice_devices ( id, mobile_devices!device_id ( mobile_models!model_id ( name, mobile_brands!brand_id ( name ) ) ) ),
        products_agg:purchase_invoice_products ( id, quantity, products!product_id ( name ) )`)
      .eq('invoice_date', date)
      .eq('status', 'confirmed')
      .limit(2000)
    if (error) throw error
    return ((data ?? []) as unknown[]).map(row => {
      const r   = row as Record<string, unknown>
      const sup = r['suppliers'] as Record<string, unknown> | null
      return {
        id:             String(r['id']),
        invoice_number: String(r['invoice_number']),
        supplier_name:  String(sup?.['name'] ?? '—'),
        total_amount:   n(r['total_amount']),
        paid_amount:    n(r['paid_amount']),
        item_names:     invoiceItemNames((r['devices_agg'] as unknown[] | null) ?? [], (r['products_agg'] as unknown[] | null) ?? []),
      }
    })
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
