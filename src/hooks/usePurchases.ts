// src/hooks/usePurchases.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { purchasesService, type PurchaseFormData } from '@/services/purchases.service'

const KEYS = {
  all:      ['purchases']           as const,
  stats:    ['purchases', 'stats']  as const,
  one:      (id: string) => ['purchases', id] as const,
  unlinked: (supplierId: string) => ['purchases', 'unlinked', supplierId] as const,
}

// Invalidate everything touched by a purchase change
function invalidatePurchaseRelated(qc: ReturnType<typeof useQueryClient>, id?: string) {
  void qc.invalidateQueries({ queryKey: KEYS.all })
  void qc.invalidateQueries({ queryKey: KEYS.stats })
  if (id) void qc.invalidateQueries({ queryKey: KEYS.one(id) })
  void qc.invalidateQueries({ queryKey: ['devices'] })
  void qc.invalidateQueries({ queryKey: ['products'] })
  // Ledger — broad invalidation since we may not know supplierId here
  void qc.invalidateQueries({ queryKey: ['ledger', 'suppliers'] })
  void qc.invalidateQueries({ queryKey: ['ledger'] })
  // PartyStatementPage lines
  void qc.invalidateQueries({ queryKey: ['statement-invoices-lines'] })
  // Payment stats
  void qc.invalidateQueries({ queryKey: ['payments', 'stats'] })
}

export function usePurchases() {
  return useQuery({ queryKey: KEYS.all, queryFn: purchasesService.getAll })
}

export function usePurchaseStats() {
  return useQuery({ queryKey: KEYS.stats, queryFn: purchasesService.getStats })
}

export function usePurchase(id: string) {
  return useQuery({
    queryKey: KEYS.one(id),
    queryFn:  () => purchasesService.getById(id),
    enabled:  !!id,
  })
}

export function useUnlinkedDevices(supplierId: string) {
  return useQuery({
    queryKey: KEYS.unlinked(supplierId),
    queryFn:  () => purchasesService.getUnlinkedDevicesBySupplier(supplierId),
    enabled:  !!supplierId,
  })
}

export function useCreatePurchase() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (form: PurchaseFormData) => purchasesService.create(form),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEYS.all })
      void qc.invalidateQueries({ queryKey: KEYS.stats })
    },
  })
}

export function useConfirmPurchase() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => purchasesService.confirm(id),
    onSuccess: (_d, id) => invalidatePurchaseRelated(qc, id),
  })
}

export function useCancelPurchase() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => purchasesService.cancel(id),
    onSuccess: (_d, id) => invalidatePurchaseRelated(qc, id),
  })
}

export function useUpdatePayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, paid, discount }: { id: string; paid: number; discount: number }) =>
      purchasesService.updatePayment(id, paid, discount),
    onSuccess: (_d, { id }) => invalidatePurchaseRelated(qc, id),
  })
}

export function useDeletePurchase() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => purchasesService.remove(id),
    onSuccess: () => invalidatePurchaseRelated(qc),
  })
}
