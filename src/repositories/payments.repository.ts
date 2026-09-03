// src/repositories/payments.repository.ts
import { supabase } from '@/lib/supabase'
import type { Payment, SupplierLedger, CustomerLedger, PaymentType, PartyType } from '@/types/database'

export interface PaymentInsert {
  payment_type:   PaymentType
  invoice_id:     string
  invoice_number: string
  party_type:     PartyType
  party_id:       string
  amount:         number
  payment_method: string
  payment_date:   string
  notes:          string | null
  created_by:     string | null
}

export interface PaymentWithParty extends Payment {
  party_name: string
}

// ── Safe number helper: Supabase numeric columns return as strings ─────────────
function n(v: unknown): number { return Number(v ?? 0) }

export const paymentsRepository = {

  // ── Create payment ────────────────────────────────────────────────────────

  create: async (payload: PaymentInsert): Promise<Payment> => {
    const { data, error } = await supabase
      .from('payments')
      .insert(payload as never)
      .select()
      .single()
    if (error) throw error
    return data as Payment
  },

  // ── Get payments by invoice ───────────────────────────────────────────────

  getByInvoice: async (invoiceId: string): Promise<Payment[]> => {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('invoice_id', invoiceId)
      .order('payment_date', { ascending: false })
    if (error) throw error
    return (data ?? []).map((r: Record<string, unknown>) => ({
      ...r,
      amount: n(r['amount']),
    })) as Payment[]
  },

  // ── Get payments by party (supplier or customer) ──────────────────────────

  getByParty: async (partyId: string): Promise<Payment[]> => {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('party_id', partyId)
      .order('payment_date', { ascending: false })
    if (error) throw error
    return (data ?? []).map((r: Record<string, unknown>) => ({
      ...r,
      amount: n(r['amount']),
    })) as Payment[]
  },

  // ── Delete payment ────────────────────────────────────────────────────────

  remove: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('payments')
      .delete()
      .eq('id', id)
    if (error) throw error
  },

  // ── Supplier ledger ───────────────────────────────────────────────────────

  getSupplierLedger: async (): Promise<SupplierLedger[]> => {
    const { data, error } = await supabase
      .from('supplier_ledger')
      .select('*')
      .order('supplier_name')
    if (error) throw error
    return (data ?? []).map((r: Record<string, unknown>) => ({
      ...r,
      opening_balance: n(r['opening_balance']),
      total_invoiced:  n(r['total_invoiced']),
      total_paid:      n(r['total_paid']),
      balance:         n(r['balance']),
    })) as SupplierLedger[]
  },

  getSupplierLedgerById: async (supplierId: string): Promise<SupplierLedger | null> => {
    const { data, error } = await supabase
      .from('supplier_ledger')
      .select('*')
      .eq('supplier_id', supplierId)
      .single()
    if (error) return null
    const r = data as Record<string, unknown>
    return {
      ...r,
      opening_balance: n(r['opening_balance']),
      total_invoiced:  n(r['total_invoiced']),
      total_paid:      n(r['total_paid']),
      balance:         n(r['balance']),
    } as SupplierLedger
  },

  // ── Customer ledger ───────────────────────────────────────────────────────

  getCustomerLedger: async (): Promise<CustomerLedger[]> => {
    const { data, error } = await supabase
      .from('customer_ledger')
      .select('*')
      .order('customer_name')
    if (error) throw error
    return (data ?? []).map((r: Record<string, unknown>) => ({
      ...r,
      opening_balance: n(r['opening_balance']),
      total_invoiced:  n(r['total_invoiced']),
      total_paid:      n(r['total_paid']),
      balance:         n(r['balance']),
    })) as CustomerLedger[]
  },

  getCustomerLedgerById: async (customerId: string): Promise<CustomerLedger | null> => {
    const { data, error } = await supabase
      .from('customer_ledger')
      .select('*')
      .eq('customer_id', customerId)
      .single()
    if (error) return null
    const r = data as Record<string, unknown>
    return {
      ...r,
      opening_balance: n(r['opening_balance']),
      total_invoiced:  n(r['total_invoiced']),
      total_paid:      n(r['total_paid']),
      balance:         n(r['balance']),
    } as CustomerLedger
  },

  // ── Purchase invoices by supplier ─────────────────────────────────────────

  getPurchaseInvoicesBySupplier: async (supplierId: string) => {
    const { data, error } = await supabase
      .from('purchase_invoices')
      .select('id, invoice_number, invoice_date, total_amount, paid_amount, discount, status, notes')
      .eq('supplier_id', supplierId)
      .eq('status', 'confirmed')
      .order('invoice_date', { ascending: true })
    if (error) throw error
    return (data ?? []).map((r: Record<string, unknown>) => {
      const total    = n(r['total_amount'])
      const paid     = n(r['paid_amount'])
      const discount = n(r['discount'])
      return {
        id:             r['id']             as string,
        invoice_number: r['invoice_number'] as string,
        invoice_date:   r['invoice_date']   as string,
        status:         r['status']         as string,
        notes:          r['notes']          as string | null,
        total_amount:   total,
        paid_amount:    paid,
        discount:       discount,
        remaining:      Math.max(0, total - paid - discount),
      }
    })
  },

  // ── Sale invoices by customer ─────────────────────────────────────────────

  getSaleInvoicesByCustomer: async (customerId: string) => {
    const { data, error } = await supabase
      .from('sale_invoices')
      .select('id, invoice_number, invoice_date, total_amount, paid_amount, discount, status, notes')
      .eq('customer_id', customerId)
      .eq('status', 'confirmed')
      .order('invoice_date', { ascending: true })
    if (error) throw error
    return (data ?? []).map((r: Record<string, unknown>) => {
      const total    = n(r['total_amount'])
      const paid     = n(r['paid_amount'])
      const discount = n(r['discount'])
      return {
        id:             r['id']             as string,
        invoice_number: r['invoice_number'] as string,
        invoice_date:   r['invoice_date']   as string,
        status:         r['status']         as string,
        notes:          r['notes']          as string | null,
        total_amount:   total,
        paid_amount:    paid,
        discount:       discount,
        remaining:      Math.max(0, total - paid - discount),
      }
    })
  },

  // ── Stats ─────────────────────────────────────────────────────────────────

  getStats: async () => {
    const { data, error } = await supabase
      .from('payments')
      .select('payment_type, amount')
    if (error) throw error
    const rows = (data ?? []).map((r: Record<string, unknown>) => ({
      payment_type: r['payment_type'] as string,
      amount:       n(r['amount']),
    }))
    return {
      totalPurchasePayments: rows.filter(r => r.payment_type === 'purchase').reduce((s, r) => s + r.amount, 0),
      totalSalePayments:     rows.filter(r => r.payment_type === 'sale').reduce((s, r) => s + r.amount, 0),
      totalPayments:         rows.length,
    }
  },
}
