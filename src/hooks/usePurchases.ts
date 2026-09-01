import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { purchasesService, type PurchaseFormData } from '@/services/purchases.service'

const KEYS = {
  all:    ['purchases']           as const,
  stats:  ['purchases', 'stats']  as const,
  one:    (id: string) => ['purchases', id] as const,
  unlinked: (supplierId: string) => ['purchases', 'unlinked', supplierId] as const,
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
    onSuccess: (_d, id) => {
      void qc.invalidateQueries({ queryKey: KEYS.all })
      void qc.invalidateQueries({ queryKey: KEYS.one(id) })
      void qc.invalidateQueries({ queryKey: KEYS.stats })
      void qc.invalidateQueries({ queryKey: ['devices'] })
    },
  })
}

export function useCancelPurchase() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => purchasesService.cancel(id),
    onSuccess: (_d, id) => {
      void qc.invalidateQueries({ queryKey: KEYS.all })
      void qc.invalidateQueries({ queryKey: KEYS.one(id) })
      void qc.invalidateQueries({ queryKey: KEYS.stats })
    },
  })
}

export function useUpdatePayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, paid, discount }: { id: string; paid: number; discount: number }) =>
      purchasesService.updatePayment(id, paid, discount),
    onSuccess: (_d, { id }) => {
      void qc.invalidateQueries({ queryKey: KEYS.all })
      void qc.invalidateQueries({ queryKey: KEYS.one(id) })
      void qc.invalidateQueries({ queryKey: KEYS.stats })
    },
  })
}

export function useDeletePurchase() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => purchasesService.remove(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEYS.all })
      void qc.invalidateQueries({ queryKey: KEYS.stats })
    },
  })
}
