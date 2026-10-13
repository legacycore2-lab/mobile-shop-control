// src/hooks/useProfitability.ts
import { useQuery } from '@tanstack/react-query'
import { profitabilityService } from '@/services/profitability.service'

export function useProfitability(from?: string, to?: string) {
  return useQuery({
    queryKey: ['reports', 'profitability', from ?? '', to ?? ''] as const,
    queryFn:  () => profitabilityService.getRows(from, to),
  })
}
