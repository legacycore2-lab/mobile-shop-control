// src/hooks/useNotificationCenter.ts
import { useCallback, useMemo, useState } from 'react'
import { useLowStockProducts } from '@/hooks/useProducts'
import { useCatalogOrders } from '@/hooks/useCatalogOrders'
import { notificationsService } from '@/services/notifications.service'
import { readJson, writeJson } from '@/lib/clientStorage'
import type { AppNotification } from '@/types/notifications'

const READ_KEY     = 'notifications:read'
const MAX_READ_IDS = 300

export interface NotificationCenter {
  items:        AppNotification[]
  unreadCount:  number
  markRead:     (id: string) => void
  markAllRead:  () => void
}

export function useNotificationCenter(includeOrders: boolean): NotificationCenter {
  const { data: lowStock = [] } = useLowStockProducts()
  const { data: orders = [] }   = useCatalogOrders(includeOrders)
  const [readIds, setReadIds]   = useState<string[]>(() => readJson<string[]>(READ_KEY, []))

  const items = useMemo(
    () => notificationsService.build({
      lowStock,
      orders:  includeOrders ? orders : [],
      readIds: new Set(readIds),
      now:     new Date(),
    }),
    [lowStock, orders, includeOrders, readIds],
  )

  const persist = useCallback((next: string[]) => {
    const trimmed = next.slice(-MAX_READ_IDS)
    setReadIds(trimmed)
    writeJson(READ_KEY, trimmed)
  }, [])

  const markRead = useCallback((id: string) => {
    if (readIds.includes(id)) return
    persist([...readIds, id])
  }, [readIds, persist])

  const markAllRead = useCallback(() => {
    const unread = items.filter(i => i.unread).map(i => i.id)
    if (!unread.length) return
    persist([...readIds, ...unread])
  }, [items, readIds, persist])

  const unreadCount = useMemo(() => items.filter(i => i.unread).length, [items])

  return { items, unreadCount, markRead, markAllRead }
}
