// src/services/notifications.service.ts
import type { LowStockProduct } from '@/repositories/products.repository'
import type { CatalogOrderWithItems } from '@/repositories/catalogOrders.repository'
import type { AppNotification, NotificationSection } from '@/types/notifications'
import { formatRelativeAr } from '@/lib/relativeTime'

const CANCELLED_WINDOW_DAYS = 7
const MAX_NOTIFICATIONS     = 60
const DAY_MS                = 86_400_000

export interface BuildNotificationsInput {
  lowStock: LowStockProduct[]
  orders:   CatalogOrderWithItems[]
  readIds:  ReadonlySet<string>
  now:      Date
}

function dayStart(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

function sectionFor(iso: string, now: Date): NotificationSection {
  const diff = Math.round((dayStart(now) - dayStart(new Date(iso))) / DAY_MS)
  if (diff <= 0) return 'today'
  if (diff === 1) return 'yesterday'
  return 'earlier'
}

function itemsLabel(count: number): string {
  if (count === 1) return 'صنف واحد'
  if (count === 2) return 'صنفين'
  return `${count} أصناف`
}

interface Dated { at: number; notification: AppNotification }

function orderNotifications(
  orders: CatalogOrderWithItems[], readIds: ReadonlySet<string>, now: Date,
): Dated[] {
  const result: Dated[] = []
  const cutoff = now.getTime() - CANCELLED_WINDOW_DAYS * DAY_MS

  for (const o of orders) {
    const isNew       = o.status === 'new'
    const isCancelled = o.status === 'cancelled' && new Date(o.updated_at).getTime() >= cutoff
    if (!isNew && !isCancelled) continue

    const at = isNew ? o.created_at : o.updated_at
    const id = `order:${o.id}:${o.status}`
    result.push({
      at: new Date(at).getTime(),
      notification: {
        id,
        kind:      isNew ? 'order_new' : 'order_cancelled',
        section:   sectionFor(at, now),
        title:     isNew ? 'طلب جديد من الكتالوج' : 'تم إلغاء الطلب',
        body:      `${o.order_number} · ${o.customer_name}`,
        chip:      null,
        detail:    itemsLabel(o.items.length),
        amount:    o.total,
        timeLabel: formatRelativeAr(at, now),
        unread:    !readIds.has(id),
        route:     '/orders',
      },
    })
  }
  return result.sort((a, b) => b.at - a.at)
}

function stockNotifications(lowStock: LowStockProduct[], readIds: ReadonlySet<string>): AppNotification[] {
  return [...lowStock]
    .sort((a, b) => a.stock_qty - b.stock_qty)
    .map(p => {
      const out = p.stock_qty === 0
      const id  = `stock:${p.product_id}:${p.stock_qty}`
      return {
        id,
        kind:      out ? 'stock_out' : 'stock_low',
        section:   'stock',
        title:     out ? 'نفد المخزون' : 'مخزون منخفض',
        body:      p.product_name,
        chip:      out ? 'الكمية 0' : `متبقي ${p.stock_qty}`,
        detail:    p.category_name || null,
        amount:    null,
        timeLabel: null,
        unread:    !readIds.has(id),
        route:     '/products',
      } satisfies AppNotification
    })
}

export const notificationsService = {
  build: ({ lowStock, orders, readIds, now }: BuildNotificationsInput): AppNotification[] => [
    ...orderNotifications(orders, readIds, now).map(d => d.notification),
    ...stockNotifications(lowStock, readIds),
  ].slice(0, MAX_NOTIFICATIONS),
}
