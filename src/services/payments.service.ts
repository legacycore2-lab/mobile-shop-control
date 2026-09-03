// src/services/payments.service.ts
import { paymentsRepository, type PaymentInsert } from '@/repositories/payments.repository'
import type { Payment, SupplierLedger, CustomerLedger, PaymentType, PartyType } from '@/types/database'

export type { PaymentInsert }

export interface PaymentFormData {
  payment_type:   PaymentType
  invoice_id:     string
  invoice_number: string
  party_type:     PartyType
  party_id:       string
  amount:         number
  payment_method: string
  payment_date:   string
  notes:          string
  created_by:     string
}

export const paymentsService = {

  create: async (form: PaymentFormData): Promise<Payment> => {
    if (!form.invoice_id)   throw new Error('الفاتورة مطلوبة')
    if (!form.party_id)     throw new Error('الطرف مطلوب')
    if (form.amount <= 0)   throw new Error('المبلغ يجب أن يكون أكبر من صفر')

    return paymentsRepository.create({
      payment_type:   form.payment_type,
      invoice_id:     form.invoice_id,
      invoice_number: form.invoice_number,
      party_type:     form.party_type,
      party_id:       form.party_id,
      amount:         form.amount,
      payment_method: form.payment_method || 'cash',
      payment_date:   form.payment_date || new Date().toISOString().split('T')[0],
      notes:          form.notes?.trim() || null,
      created_by:     form.created_by || null,
    })
  },

  getByInvoice: (invoiceId: string): Promise<Payment[]> =>
    paymentsRepository.getByInvoice(invoiceId),

  getByParty: (partyId: string): Promise<Payment[]> =>
    paymentsRepository.getByParty(partyId),

  remove: (id: string): Promise<void> =>
    paymentsRepository.remove(id),

  getSupplierLedger: (): Promise<SupplierLedger[]> =>
    paymentsRepository.getSupplierLedger(),

  getSupplierLedgerById: (id: string): Promise<SupplierLedger | null> =>
    paymentsRepository.getSupplierLedgerById(id),

  getCustomerLedger: (): Promise<CustomerLedger[]> =>
    paymentsRepository.getCustomerLedger(),

  getCustomerLedgerById: (id: string): Promise<CustomerLedger | null> =>
    paymentsRepository.getCustomerLedgerById(id),

  getStats: () => paymentsRepository.getStats(),
}
