// src/hooks/useDailyClose.ts
import { useQuery } from '@tanstack/react-query'
import { dailyCloseService } from '@/services/dailyClose.service'

export function useDailyClose(date: string) {
  return useQuery({
    queryKey:       ['daily_close', date],
    queryFn:        () => dailyCloseService.get(date),
    staleTime:      30_000,
    refetchOnMount: 'always',
  })
}
