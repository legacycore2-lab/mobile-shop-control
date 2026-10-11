// src/hooks/useCatalog.ts
import { useMemo, useEffect, useCallback } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { catalogService, trackingService, type CartLine, type OrderForm } from '@/services/catalog.service'
import { getSessionId } from '@/lib/clientStorage'

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
  return { entries, store: query.data?.store ?? null, reviews: query.data?.reviews ?? [], isLoading: query.isLoading, isError: query.isError, refetch: query.refetch }
}

export function useSubmitCatalogOrder() {
  return useMutation({
    mutationFn: ({ form, lines }: { form: OrderForm; lines: CartLine[] }) =>
      catalogService.submitOrder(form, lines),
  })
}

export function useTrackOrder() {
  return useMutation({
    mutationFn: ({ number, phone }: { number: string; phone: string }) => trackingService.track(number, phone),
  })
}

export function useSubmitReview() {
  return useMutation({
    mutationFn: ({ number, phone, rating, comment }: { number: string; phone: string; rating: number; comment: string }) =>
      trackingService.review(number, phone, rating, comment),
  })
}

// تسجيل زيارة (مرة لكل جلسة) ومشاهدة صنف
export function useCatalogAnalytics() {
  const session = useMemo(() => getSessionId(), [])
  useEffect(() => {
    void trackingService.logEvent('visit', null, session)
  }, [session])
  return useCallback((itemName: string) => { void trackingService.logEvent('view', itemName, session) }, [session])
}
