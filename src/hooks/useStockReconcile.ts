// src/hooks/useStockReconcile.ts
import { useQuery } from '@tanstack/react-query'
import { stockReconcileService } from '@/services/stockReconcile.service'

// المفتاح تحت ['devices'] عشان الـ realtime يحدّثه لما أي جهاز يتغير
export function useReconcileDevices() {
  return useQuery({
    queryKey: ['devices', 'reconcile'],
    queryFn:  stockReconcileService.getDevices,
  })
}
