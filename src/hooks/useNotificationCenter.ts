// src/hooks/useNotificationCenter.ts
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLowStockProducts } from '@/hooks/useProducts'
import { useCatalogOrders } from '@/hooks/useCatalogOrders'
import { notificationsService } from '@/services/notifications.service'
import { readJson, writeJson } from '@/lib/clientStorage'
import {
  isSoundEnabled, playNotificationSound, setSoundEnabled, unlockNotificationAudio,
} from '@/lib/notificationSound'
import type { AppNotification } from '@/types/notifications'

const READ_KEY     = 'notifications:read'
const MAX_READ_IDS = 300

export interface NotificationCenter {
  items:        AppNotification[]
  unreadCount:  number
  markRead:     (id: string) => void
  markAllRead:  () => void
  soundEnabled: boolean
  toggleSound:  () => void
}

export function useNotificationCenter(includeOrders: boolean): NotificationCenter {
  const { data: lowStock = [], isSuccess: stockLoaded }   = useLowStockProducts()
  const { data: orders = [],   isSuccess: ordersLoaded }  = useCatalogOrders(includeOrders)
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

  const [soundEnabled, setSound] = useState<boolean>(isSoundEnabled)
  const soundRef = useRef(soundEnabled)
  soundRef.current = soundEnabled

  const toggleSound = useCallback(() => {
    const next = !soundRef.current
    setSound(next)
    setSoundEnabled(next)
    if (next) playNotificationSound()
  }, [])

  useEffect(() => unlockNotificationAudio(), [])

  // نغمة عند ظهور إشعار غير مقروء جديد (بعد التحميل الأول)
  const knownIds = useRef<Set<string> | null>(null)
  const loaded   = stockLoaded && (!includeOrders || ordersLoaded)

  useEffect(() => {
    if (!loaded) return
    const unreadIds = items.filter(i => i.unread).map(i => i.id)
    if (knownIds.current === null) {
      knownIds.current = new Set(unreadIds)
      return
    }
    const known = knownIds.current
    const hasNew = unreadIds.some(id => !known.has(id))
    unreadIds.forEach(id => known.add(id))
    if (hasNew && soundRef.current) playNotificationSound()
  }, [items, loaded])

  return { items, unreadCount, markRead, markAllRead, soundEnabled, toggleSound }
}
