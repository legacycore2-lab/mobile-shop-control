// src/hooks/usePos.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { posService, type SaleFormData } from '@/services/pos.service'

const KEYS = {
  all:     ['sales']            as const,
  stats:   ['sales', 'stats']   as const,
  one:     (id: string) => ['sales', id] as const,
  inStock: ['devices', 'in_stock'] as const,
}

function invalidateSaleRelated(qc: ReturnType<typeof useQueryClient>, id?: string) {
  void qc.invalidateQueries({ queryKey: KEYS.all })
  void qc.invalidateQueries({ queryKey: KEYS.stats })
  if (id) void qc.invalidateQueries({ queryKey: KEYS.one(id) })
  void qc.invalidateQueries({ queryKey: KEYS.inStock })
  void qc.invalidateQueries({ queryKey: ['devices'] })
  void qc.invalidateQueries({ queryKey: ['products'] })
  // Ledger — customer side
  void qc.invalidateQueries({ queryKey: ['ledger', 'customers'] })
  void qc.invalidateQueries({ queryKey: ['ledger'] })
  // PartyStatementPage lines
  void qc.invalidateQueries({ queryKey: ['statement-invoices-lines'] })
  // Payment stats
  void qc.invalidateQueries({ queryKey: ['payments', 'stats'] })
}

export function useSaleInvoices() {
  return useQuery({ queryKey: KEYS.all, queryFn: posService.getAll })
}

export function useSaleStats() {
  return useQuery({ queryKey: KEYS.stats, queryFn: posService.getStats })
}

export function useSaleInvoice(id: string) {
  return useQuery({
    queryKey: KEYS.one(id),
    queryFn:  () => posService.getById(id),
    enabled:  !!id,
  })
}

export function useInStockDevices() {
  return useQuery({
    queryKey: KEYS.inStock,
    queryFn:  posService.getInStockDevices,
    staleTime: 30_000,
  })
}

export function useCreateSale() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (form: SaleFormData) => posService.create(form),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEYS.all })
      void qc.invalidateQueries({ queryKey: KEYS.stats })
    },
  })
}

export function useConfirmSale() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, customerId, soldById }: { id: string; customerId: string | null; soldById: string }) =>
      posService.confirm(id, customerId, soldById),
    onSuccess: (_d, { id }) => invalidateSaleRelated(qc, id),
  })
}

export function useCancelSale() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => posService.cancel(id),
    onSuccess: (_d, id) => invalidateSaleRelated(qc, id),
  })
}

export function useDeleteSale() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => posService.remove(id),
    onSuccess: () => invalidateSaleRelated(qc),
  })
}
