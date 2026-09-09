// src/services/payments.service.ts
import { paymentsRepository, type PaymentInsert, type PaymentUpdate } from '@/repositories/payments.repository'
import { logAction } from '@/lib/audit'
import type { Payment, SupplierLedger, CustomerLedger, PaymentType, PartyType } from '@/types/database'

export type { PaymentInsert, PaymentUpdate }

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

export interface PaymentUpdateFormData {
  amount:         number
  payment_method: string
  payment_date:   string
  notes:          string
}

export const paymentsService = {

  create: async (form: PaymentFormData): Promise<Payment> => {
    if (!form.invoice_id) throw new Error('الفاتورة مطلوبة')
    if (!form.party_id)   throw new Error('الطرف مطلوب')
    if (form.amount <= 0) throw new Error('المبلغ يجب أن يكون أكبر من صفر')

    const result = await paymentsRepository.create({
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

    if (form.created_by) void logAction({
      userId:      form.created_by,
      action:      'pay',
      table:       'payments',
      recordId:    result.id,
      description: `دفع ${form.amount} ج بـ${form.payment_method === 'cash' ? 'النقدي' : form.payment_method === 'bank_transfer' ? 'تحويل بنكي' : form.payment_method} على فاتورة ${form.invoice_number} | ${form.party_type === 'supplier' ? 'مورد' : 'عميل'}`,
      newData:     { amount: form.amount, payment_method: form.payment_method, invoice_number: form.invoice_number, party_type: form.party_type },
    })

    return result
  },

  update: async (id: string, form: PaymentUpdateFormData, userId?: string): Promise<Payment> => {
    if (!id)              throw new Error('معرف الدفعة مطلوب')
    if (form.amount <= 0) throw new Error('المبلغ يجب أن يكون أكبر من صفر')

    const result = await paymentsRepository.update(id, {
      amount:         form.amount,
      payment_method: form.payment_method || 'cash',
      payment_date:   form.payment_date || new Date().toISOString().split('T')[0],
      notes:          form.notes?.trim() || null,
    })

    if (userId) void logAction({ userId, action: 'update', table: 'payments', recordId: id, description: `تعديل دفعة — المبلغ الجديد: ${form.amount} ج`, newData: { amount: form.amount, payment_method: form.payment_method } })

    return result
  },

  remove: async (id: string, userId?: string): Promise<void> => {
    if (userId) void logAction({ userId, action: 'delete', table: 'payments', recordId: id, description: 'حذف دفعة' })
    return paymentsRepository.remove(id)
  },

  getByInvoice:   (invoiceId: string): Promise<Payment[]>           => paymentsRepository.getByInvoice(invoiceId),
  getByParty:     (partyId: string):   Promise<Payment[]>           => paymentsRepository.getByParty(partyId),
  getStats:       ()                                                 => paymentsRepository.getStats(),
  getSupplierLedger:         ()                                      => paymentsRepository.getSupplierLedger(),
  getSupplierLedgerById:     (id: string)                           => paymentsRepository.getSupplierLedgerById(id),
  getCustomerLedger:         ()                                      => paymentsRepository.getCustomerLedger(),
  getCustomerLedgerById:     (id: string)                           => paymentsRepository.getCustomerLedgerById(id),
  getPurchaseInvoicesBySupplier:          (id: string)              => paymentsRepository.getPurchaseInvoicesBySupplier(id),
  getSaleInvoicesByCustomer:              (id: string)              => paymentsRepository.getSaleInvoicesByCustomer(id),
  getPurchaseInvoiceLinesBySupplier:      (id: string)              => paymentsRepository.getPurchaseInvoiceLinesBySupplier(id),
  getSaleInvoiceLinesByCustomer:          (id: string)              => paymentsRepository.getSaleInvoiceLinesByCustomer(id),
}
