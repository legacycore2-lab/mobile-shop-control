// src/hooks/useNotifications.ts
import { useEffect, useRef } from 'react'
import { useLowStockProducts } from '@/hooks/useProducts'
import {
  notificationsEnabled, sendNotification,
  getNotifiedIds, addNotifiedId,
} from '@/lib/notifications'

// ── Hook — يراقب المخزون المنخفض ويبعت Browser Notifications ─────────────────

export function useStockNotifications() {
  const { data: lowStock = [] } = useLowStockProducts()
  const prevCountRef = useRef(0)

  useEffect(() => {
    if (!notificationsEnabled()) return
    if (!lowStock.length) return

    const notified = getNotifiedIds()
    let sentNew = false

    for (const item of lowStock) {
      if (notified.has(item.product_id)) continue

      const label = item.stock_qty === 0 ? 'نفد المخزون' : 'مخزون منخفض'
      const body  = item.stock_qty === 0
        ? `${item.product_name} — نفد المخزون تماماً`
        : `${item.product_name} — متبقي ${item.stock_qty} ${item.category_name ? `(${item.category_name})` : ''}`

      sendNotification(`⚠️ ${label}`, body, `stock-${item.product_id}`)
      addNotifiedId(item.product_id)
      sentNew = true
    }

    // لو عدد التنبيهات زاد عن المرة اللي فاتت — بعت summary
    if (!sentNew && lowStock.length > prevCountRef.current && lowStock.length > 1) {
      sendNotification(
        '⚠️ تنبيهات مخزون',
        `${lowStock.length} منتجات وصلت لحد الطلب`,
        'stock-summary',
      )
    }

    prevCountRef.current = lowStock.length
  }, [lowStock])
}

// ── حساب عدد التنبيهات للـ badge ─────────────────────────────────────────────

export function useAlertCount(): number {
  const { data: lowStock = [] } = useLowStockProducts()
  return lowStock.length
}
