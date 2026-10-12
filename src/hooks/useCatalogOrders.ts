// src/hooks/useCatalogOrders.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { catalogOrdersService, type CatalogOrderWithItems, type DeliveryInput } from '@/services/catalogOrders.service'
import type { CatalogOrderStatus } from '@/types/database'

const KEYS = {
  all:      ['catalog_orders']          as const,
  newCount: ['catalog_orders', 'new']   as const,
}

export function useCatalogOrders(enabled = true) {
  return useQuery({
    queryKey:        KEYS.all,
    queryFn:         catalogOrdersService.getAll,
    enabled,
    refetchInterval: 30_000,
  })
}

export function useNewOrdersCount(enabled: boolean) {
  const { data = 0 } = useQuery({
    queryKey:        KEYS.newCount,
    queryFn:         catalogOrdersService.countNew,
    enabled,
    refetchInterval: 30_000,
  })
  return data
}

export function useUpdateOrderStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status, userId }: { id: string; status: CatalogOrderStatus; userId: string }) =>
      catalogOrdersService.updateStatus(id, status, userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  })
}

export function useDeliverOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ order, input }: { order: CatalogOrderWithItems; input: DeliveryInput }) =>
      catalogOrdersService.deliver(order, input),
    // التسليم بيغيّر المبيعات والمخزون والعملاء والمدفوعات
    onSuccess: () => qc.invalidateQueries(),
  })
}
