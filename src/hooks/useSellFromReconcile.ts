// src/hooks/useSellFromReconcile.ts
import { useNavigate } from 'react-router-dom'
import { usePermissions } from '@/hooks/usePermissions'
import type { ReconcileDevice } from '@/types/stockReconcile'

// بيفتح فاتورة بيع جديدة في نقطة البيع والجهاز متحدد (undefined لو مفيش صلاحية بيع)
export function useSellFromReconcile(): ((device: ReconcileDevice) => void) | undefined {
  const navigate = useNavigate()
  const { canCreate } = usePermissions()
  if (!canCreate('pos')) return undefined
  return device => navigate('/pos', { state: { autoDeviceId: device.id } })
}
