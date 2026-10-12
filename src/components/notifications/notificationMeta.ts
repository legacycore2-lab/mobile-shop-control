// src/components/notifications/notificationMeta.ts
import { AlertCircle, ClipboardList, TrendingDown, XCircle } from 'lucide-react'
import type { ElementType } from 'react'
import type { NotificationKind } from '@/types/notifications'

export const NOTIFICATION_META: Record<NotificationKind, {
  icon:    ElementType
  tile:    string
  chip:    string
}> = {
  order_new: {
    icon: ClipboardList,
    tile: 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300',
    chip: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  },
  order_cancelled: {
    icon: XCircle,
    tile: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    chip: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  },
  stock_out: {
    icon: AlertCircle,
    tile: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
    chip: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  },
  stock_low: {
    icon: TrendingDown,
    tile: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    chip: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  },
}
