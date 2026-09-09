// src/hooks/usePayments.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { paymentsService, type PaymentFormData, type PaymentUpdateFormData } from '@/services/payments.service'

const KEYS = {
  all:            ['payments']                          as const,
  byInvoice:      (id: string) => ['payments', 'invoice', id] as const,
  byParty:        (id: string) => ['payments', 'party',   id] as const,
  supplierLedger: ['ledger', 'suppliers']               as const,
  supplierOne:    (id: string) => ['ledger', 'suppliers', id] as const,
  customerLedger: ['ledger', 'customers']               as const,
  customerOne:    (id: string) => ['ledger', 'customers', id] as const,
  stats:          ['payments', 'stats']                 as const,
  statementLines: (type: string, id: string) => ['statement-invoices-lines', type, id] as const,
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

// ── Invalidate everything related to a party's statement ─────────────────────
function invalidateAll(
  qc: ReturnType<typeof useQueryClient>,
  opts?: { partyId?: string; partyType?: 'supplier' | 'customer'; invoiceId?: string },
) {
  void qc.invalidateQueries({ queryKey: KEYS.all })
  if (opts?.invoiceId) void qc.invalidateQueries({ queryKey: KEYS.byInvoice(opts.invoiceId) })
  if (opts?.partyId)   void qc.invalidateQueries({ queryKey: KEYS.byParty(opts.partyId) })

  void qc.invalidateQueries({ queryKey: KEYS.supplierLedger })
  void qc.invalidateQueries({ queryKey: KEYS.customerLedger })
  if (opts?.partyId && opts?.partyType === 'supplier')
    void qc.invalidateQueries({ queryKey: KEYS.supplierOne(opts.partyId) })
  if (opts?.partyId && opts?.partyType === 'customer')
    void qc.invalidateQueries({ queryKey: KEYS.customerOne(opts.partyId) })

  if (opts?.partyId && opts?.partyType)
    void qc.invalidateQueries({ queryKey: KEYS.statementLines(opts.partyType, opts.partyId) })

  void qc.invalidateQueries({ queryKey: ['purchases'] })
  void qc.invalidateQueries({ queryKey: ['sales'] })
  void qc.invalidateQueries({ queryKey: ['payments', 'stats'] })
}

export function useCreatePayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (form: PaymentFormData) => paymentsService.create(form),
    onSuccess: (_data, form) => {
      invalidateAll(qc, {
        partyId:   form.party_id,
        partyType: form.party_type as 'supplier' | 'customer',
        invoiceId: form.invoice_id,
      })
    },
  })
}

export function useUpdatePayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, form }: { id: string; form: PaymentUpdateFormData }) =>
      paymentsService.update(id, form),
    onSuccess: () => {
      // Invalidate everything — we don't carry party info here
      void qc.invalidateQueries({ queryKey: KEYS.all })
      void qc.invalidateQueries({ queryKey: KEYS.supplierLedger })
      void qc.invalidateQueries({ queryKey: KEYS.customerLedger })
      void qc.invalidateQueries({ queryKey: ['ledger'] })
      void qc.invalidateQueries({ queryKey: ['statement-invoices-lines'] })
      void qc.invalidateQueries({ queryKey: ['purchases'] })
      void qc.invalidateQueries({ queryKey: ['sales'] })
      void qc.invalidateQueries({ queryKey: KEYS.stats })
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
      void qc.invalidateQueries({ queryKey: ['ledger'] })
      void qc.invalidateQueries({ queryKey: ['statement-invoices-lines'] })
      void qc.invalidateQueries({ queryKey: ['purchases'] })
      void qc.invalidateQueries({ queryKey: ['sales'] })
      void qc.invalidateQueries({ queryKey: KEYS.stats })
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
