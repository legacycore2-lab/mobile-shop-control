// src/hooks/useCatalog.ts
import { useMemo } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { catalogService, type CartLine, type OrderForm } from '@/services/catalog.service'

export function useCatalogEntries() {
  const query = useQuery({
    queryKey:  ['catalog', 'public'],
    queryFn:   catalogService.getCatalog,
    staleTime: 30_000,
  })
  const entries = useMemo(
    () => (query.data ? catalogService.toEntries(query.data) : []),
    [query.data],
  )
  return { entries, isLoading: query.isLoading, isError: query.isError, refetch: query.refetch }
}

export function useSubmitCatalogOrder() {
  return useMutation({
    mutationFn: ({ form, lines }: { form: OrderForm; lines: CartLine[] }) =>
      catalogService.submitOrder(form, lines),
  })
}
