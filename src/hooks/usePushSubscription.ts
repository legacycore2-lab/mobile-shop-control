// src/hooks/usePushSubscription.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { pushService } from '@/services/push.service'

const KEY = ['push_subscription'] as const

export function usePushSubscribed() {
  return useQuery({ queryKey: KEY, queryFn: pushService.isSubscribed })
}

export function useEnablePush() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => pushService.enable(userId),
    onSuccess:  () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useDisablePush() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => pushService.disable(),
    onSuccess:  () => qc.invalidateQueries({ queryKey: KEY }),
  })
}
