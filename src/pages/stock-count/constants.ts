// src/pages/stock-count/constants.ts
import type { StockCountItemType } from '@/types/stockCount'

export const ITEM_TYPE_LABEL: Record<StockCountItemType, string> = {
  product: 'منتج',
  model:   'موبايل',
}

export const ITEM_UNIT: Record<StockCountItemType, string> = {
  product: 'قطعة',
  model:   'جهاز',
}

export const FIELD_CLASS =
  'h-9 w-full px-3 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500'
