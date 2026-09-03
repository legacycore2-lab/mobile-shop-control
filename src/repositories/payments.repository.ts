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
    return (data ?? []) as Payment[]
  },

  // ── Get payments by party (supplier or customer) ──────────────────────────

  getByParty: async (partyId: string): Promise<Payment[]> => {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('party_id', partyId)
      .order('payment_date', { ascending: false })
    if (error) throw error
    return (data ?? []) as Payment[]
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
    return (data ?? []) as SupplierLedger[]
  },

  getSupplierLedgerById: async (supplierId: string): Promise<SupplierLedger | null> => {
    const { data, error } = await supabase
      .from('supplier_ledger')
      .select('*')
      .eq('supplier_id', supplierId)
      .single()
    if (error) return null
    return data as SupplierLedger
  },

  // ── Customer ledger ───────────────────────────────────────────────────────

  getCustomerLedger: async (): Promise<CustomerLedger[]> => {
    const { data, error } = await supabase
      .from('customer_ledger')
      .select('*')
      .order('customer_name')
    if (error) throw error
    return (data ?? []) as CustomerLedger[]
  },

  getCustomerLedgerById: async (customerId: string): Promise<CustomerLedger | null> => {
    const { data, error } = await supabase
      .from('customer_ledger')
      .select('*')
      .eq('customer_id', customerId)
      .single()
    if (error) return null
    return data as CustomerLedger
  },

  // ── Stats ─────────────────────────────────────────────────────────────────

  getStats: async () => {
    const { data, error } = await supabase
      .from('payments')
      .select('payment_type, amount')
    if (error) throw error
    const rows = (data ?? []) as { payment_type: string; amount: number }[]
    return {
      totalPurchasePayments: rows.filter(r => r.payment_type === 'purchase').reduce((s, r) => s + r.amount, 0),
      totalSalePayments:     rows.filter(r => r.payment_type === 'sale').reduce((s, r) => s + r.amount, 0),
      totalPayments:         rows.length,
    }
  },
}
