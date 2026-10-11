// src/hooks/useStoreInfo.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { storeInfoService } from '@/services/storeInfo.service'
import type { StoreInfo } from '@/types/database'

const KEY = ['store_info'] as const

export function useStoreInfo() {
  return useQuery({ queryKey: KEY, queryFn: storeInfoService.get })
}

export function useUpdateStoreInfo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (info: StoreInfo) => storeInfoService.update(info),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEY })
      void qc.invalidateQueries({ queryKey: ['catalog', 'public'] })
    },
  })
}
