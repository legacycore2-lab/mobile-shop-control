// src/services/catalogOrders.service.ts
import { catalogOrdersRepository, type CatalogOrderWithItems } from '@/repositories/catalogOrders.repository'
import type { CatalogOrderStatus } from '@/types/database'

export type { CatalogOrderWithItems }

const STATUS_LINE: Record<CatalogOrderStatus, string> = {
  new:       'استلمنا طلبك وبنراجعه وهنأكّده معاك.',
  confirmed: 'تم تأكيد طلبك وجاري تجهيزه.',
  completed: 'تم تسليم طلبك. شكرًا لثقتك فينا.',
  cancelled: 'تم إلغاء طلبك. لو محتاج أي مساعدة كلمنا.',
}

const fmtNum = (n: number): string => n.toLocaleString('en-US')

// نص رسالة واتساب للعميل حسب حالة الطلب
export function buildOrderMessage(order: CatalogOrderWithItems): string {
  const lines = order.items.map(i => `• ${i.name} × ${i.quantity} — ${fmtNum(i.unit_price * i.quantity)} ج`)
  return [
    `أهلاً ${order.customer_name}،`,
    STATUS_LINE[order.status],
    '',
    `رقم الطلب: ${order.order_number}`,
    ...lines,
    `الإجمالي: ${fmtNum(order.total)} ج`,
    '',
    'الشافعي ستور',
  ].join('\n')
}

export const catalogOrdersService = {
  getAll:       (): Promise<CatalogOrderWithItems[]> => catalogOrdersRepository.getAll(),
  countNew:     (): Promise<number>                  => catalogOrdersRepository.countNew(),
  updateStatus: (id: string, status: CatalogOrderStatus, userId: string): Promise<void> =>
    catalogOrdersRepository.updateStatus(id, status, userId),
}

export interface TopOrderedItem { name: string; quantity: number; orders: number }

// الأصناف الأكثر طلبًا (من الطلبات غير الملغية)
export function topOrderedItems(orders: CatalogOrderWithItems[], limit = 5): TopOrderedItem[] {
  const map = new Map<string, TopOrderedItem>()
  for (const o of orders) {
    if (o.status === 'cancelled') continue
    for (const it of o.items) {
      const e = map.get(it.name) ?? { name: it.name, quantity: 0, orders: 0 }
      e.quantity += it.quantity
      e.orders   += 1
      map.set(it.name, e)
    }
  }
  return [...map.values()].sort((a, b) => b.quantity - a.quantity || b.orders - a.orders).slice(0, limit)
}
