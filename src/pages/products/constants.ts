// src/pages/products/constants.ts
import type { ProductType } from '@/types/database'

export { fmt } from '@/constants/statusMaps'

export const TYPE_MAP: Record<ProductType, { label: string; variant: 'info' | 'warning' }> = {
  accessory:  { label: 'إكسسوار',   variant: 'info'    },
  spare_part: { label: 'قطعة غيار', variant: 'warning' },
}

export type FilterType = 'all' | ProductType | 'low_stock' | 'inactive'

export const PAGE_SIZE = 10
