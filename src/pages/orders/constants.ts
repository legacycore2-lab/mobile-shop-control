// src/pages/orders/constants.ts
import type { CatalogOrderStatus } from '@/types/database'

export const ORDER_STATUS_MAP: Record<CatalogOrderStatus, {
  label:   string
  variant: 'info' | 'warning' | 'success' | 'danger'
}> = {
  new:       { label: 'جديد',      variant: 'info'    },
  confirmed: { label: 'مؤكد',      variant: 'warning' },
  completed: { label: 'تم التسليم', variant: 'success' },
  cancelled: { label: 'ملغي',      variant: 'danger'  },
}

export type OrderFilter = 'all' | CatalogOrderStatus

export const ORDER_FILTERS: { id: OrderFilter; label: string }[] = [
  { id: 'all',       label: 'الكل'        },
  { id: 'new',       label: 'جديد'        },
  { id: 'confirmed', label: 'مؤكد'        },
  { id: 'completed', label: 'تم التسليم'  },
  { id: 'cancelled', label: 'ملغي'        },
]

export function fmtOrderDate(iso: string): string {
  return new Date(iso).toLocaleString('ar-EG', {
    day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
  })
}
