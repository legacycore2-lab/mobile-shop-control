// src/hooks/usePayments.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { paymentsService, type PaymentFormData } from '@/services/payments.service'

const KEYS = {
  all:            ['payments']                          as const,
  byInvoice:      (id: string) => ['payments', 'invoice', id] as const,
  byParty:        (id: string) => ['payments', 'party',   id] as const,
  supplierLedger: ['ledger', 'suppliers']               as const,
  supplierOne:    (id: string) => ['ledger', 'suppliers', id] as const,
  customerLedger: ['ledger', 'customers']               as const,
  customerOne:    (id: string) => ['ledger', 'customers', id] as const,
  stats:          ['payments', 'stats']                 as const,
}

export function usePaymentsByInvoice(invoiceId: string) {
  return useQuery({
    queryKey: KEYS.byInvoice(invoiceId),
    queryFn:  () => paymentsService.getByInvoice(invoiceId),
    enabled:  !!invoiceId,
  })
}

export function usePaymentsByParty(partyId: string) {
  return useQuery({
    queryKey: KEYS.byParty(partyId),
    queryFn:  () => paymentsService.getByParty(partyId),
    enabled:  !!partyId,
  })
}

export function useCreatePayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (form: PaymentFormData) => paymentsService.create(form),
    onSuccess: (_data, form) => {
      void qc.invalidateQueries({ queryKey: KEYS.byInvoice(form.invoice_id) })
      void qc.invalidateQueries({ queryKey: KEYS.byParty(form.party_id) })
      void qc.invalidateQueries({ queryKey: KEYS.supplierLedger })
      void qc.invalidateQueries({ queryKey: KEYS.customerLedger })
      void qc.invalidateQueries({ queryKey: KEYS.stats })
      void qc.invalidateQueries({ queryKey: ['purchases'] })
      void qc.invalidateQueries({ queryKey: ['sales'] })
    },
  })
}

export function useDeletePayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => paymentsService.remove(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEYS.all })
      void qc.invalidateQueries({ queryKey: KEYS.supplierLedger })
      void qc.invalidateQueries({ queryKey: KEYS.customerLedger })
    },
  })
}

export function useSupplierLedger() {
  return useQuery({
    queryKey: KEYS.supplierLedger,
    queryFn:  paymentsService.getSupplierLedger,
  })
}

export function useSupplierLedgerById(supplierId: string) {
  return useQuery({
    queryKey: KEYS.supplierOne(supplierId),
    queryFn:  () => paymentsService.getSupplierLedgerById(supplierId),
    enabled:  !!supplierId,
  })
}

export function useCustomerLedger() {
  return useQuery({
    queryKey: KEYS.customerLedger,
    queryFn:  paymentsService.getCustomerLedger,
  })
}

export function useCustomerLedgerById(customerId: string) {
  return useQuery({
    queryKey: KEYS.customerOne(customerId),
    queryFn:  () => paymentsService.getCustomerLedgerById(customerId),
    enabled:  !!customerId,
  })
}

export function usePaymentStats() {
  return useQuery({
    queryKey: KEYS.stats,
    queryFn:  paymentsService.getStats,
  })
}
