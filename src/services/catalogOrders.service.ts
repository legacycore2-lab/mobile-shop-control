// src/services/catalogOrders.service.ts
import { catalogOrdersRepository, type CatalogOrderWithItems } from '@/repositories/catalogOrders.repository'
import { customersRepository } from '@/repositories/customers.repository'
import { posService, type SaleDeviceLine, type SaleProductLine } from '@/services/pos.service'
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

export interface DeliveryInput {
  paidAmount: number
  discount:   number
  userId:     string
}

export const catalogOrdersService = {
  getAll:       (): Promise<CatalogOrderWithItems[]> => catalogOrdersRepository.getAll(),
  countNew:     (): Promise<number>                  => catalogOrdersRepository.countNew(),
  updateStatus: (id: string, status: CatalogOrderStatus, userId: string): Promise<void> =>
    catalogOrdersRepository.updateStatus(id, status, userId),

  // تسليم الطلب: عميل (لو مش موجود) + فاتورة بيع مؤكدة + دفعة + إقفال الطلب
  deliver: async (order: CatalogOrderWithItems, input: DeliveryInput): Promise<void> => {
    if (order.sale_invoice_id) throw new Error('الطلب ده اتسلّم وله فاتورة بيع بالفعل')
    const discount = Number(input.discount) || 0
    const paid     = Number(input.paidAmount) || 0
    const net      = order.total - discount
    if (discount < 0 || discount > order.total) throw new Error('الخصم غير صحيح')
    if (paid < 0 || paid > net)                 throw new Error('المبلغ المستلم أكبر من إجمالي الفاتورة')

    const deviceLines:  SaleDeviceLine[]  = []
    const productLines: SaleProductLine[] = []
    for (const it of order.items) {
      if (it.item_type === 'device' && it.device_id) {
        deviceLines.push({ device_id: it.device_id, actual_selling_price: it.unit_price })
      } else if (it.item_type === 'product' && it.product_id) {
        productLines.push({ product_id: it.product_id, quantity: it.quantity, unit_price: it.unit_price })
      } else {
        throw new Error(`الصنف "${it.name}" اتحذف من النظام، مينفعش يتسلّم`)
      }
    }

    if (deviceLines.length) {
      const available = new Set((await posService.getInStockDevices()).map(d => d.id))
      const gone = deviceLines.find(l => !available.has(l.device_id))
      if (gone) throw new Error('أحد الأجهزة في الطلب اتباع أو اتحجز، راجع الطلب')
    }

    const customer = await customersRepository.findByPhone(order.customer_phone)
      ?? await customersRepository.create({
        name: order.customer_name, phone: order.customer_phone, national_id: null,
        address: null, notes: 'من كتالوج الأونلاين', opening_balance: 0,
        is_active: true, created_by: input.userId,
      })

    const invoice = await posService.create({
      customer_id:   customer.id,
      invoice_date:  new Date().toISOString().slice(0, 10),
      paid_amount:   paid,
      discount,
      notes:         `طلب كتالوج ${order.order_number}`,
      created_by:    input.userId,
      device_lines:  deviceLines,
      product_lines: productLines,
    })
    await posService.confirm(invoice.id, customer.id, input.userId)
    await catalogOrdersRepository.complete(order.id, invoice.id, paid, input.userId)
  },
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
