// src/pages/orders/OrderDrawer.tsx
import { useState } from 'react'
import { X, Phone, MessageCircle } from 'lucide-react'
import { DeliveryForm } from './DeliveryForm'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { fmt } from '@/lib/fmt'
import { whatsappUrl } from '@/lib/whatsapp'
import { buildOrderMessage } from '@/services/catalogOrders.service'
import { ORDER_STATUS_MAP, fmtOrderDate } from './constants'
import type { CatalogOrderWithItems, DeliveryInput } from '@/services/catalogOrders.service'
import type { CatalogOrderStatus } from '@/types/database'

interface Props {
  order:        CatalogOrderWithItems
  canEdit:      boolean
  saving:       boolean
  onChangeStatus: (status: CatalogOrderStatus) => void
  onDeliver:    (input: Omit<DeliveryInput, 'userId'>) => Promise<void>
  delivering:   boolean
  onClose:      () => void
}

const NEXT_ACTIONS: Record<CatalogOrderStatus, { status: CatalogOrderStatus; label: string; variant: 'primary' | 'danger' | 'secondary' }[]> = {
  new:       [
    { status: 'confirmed', label: 'تأكيد الطلب', variant: 'primary' },
    { status: 'cancelled', label: 'إلغاء',       variant: 'danger'  },
  ],
  confirmed: [
    { status: 'completed', label: 'تم التسليم', variant: 'primary' },
    { status: 'cancelled', label: 'إلغاء',      variant: 'danger'  },
  ],
  completed: [],
  cancelled: [
    { status: 'new', label: 'إعادة فتح', variant: 'secondary' },
  ],
}

export function OrderDrawer({ order, canEdit, saving, onChangeStatus, onDeliver, delivering, onClose }: Props) {
  const st = ORDER_STATUS_MAP[order.status]
  const [showDelivery,   setShowDelivery]   = useState(false)
  const [deliveryError,  setDeliveryError]  = useState('')

  async function handleDeliver(input: Omit<DeliveryInput, 'userId'>) {
    setDeliveryError('')
    try {
      await onDeliver(input)
      setShowDelivery(false)
    } catch (e) {
      setDeliveryError((e as { message?: string }).message ?? 'تعذّر التسليم')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-end"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-md h-full bg-white dark:bg-gray-900 shadow-2xl flex flex-col overflow-hidden" dir="rtl">

        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800">
          <div>
            <p className="font-bold text-gray-900 dark:text-white text-sm" dir="ltr">{order.order_number}</p>
            <p className="text-xs text-gray-400 dark:text-gray-600">{fmtOrderDate(order.created_at)}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={st.variant}>{st.label}</Badge>
            <button onClick={onClose}
              className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800">
              <X size={14} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-800 p-4 space-y-3">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">العميل</p>
              <p className="text-sm font-bold text-gray-900 dark:text-white">{order.customer_name}</p>
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300" dir="ltr" style={{ textAlign: 'right' }}>{order.customer_phone}</p>
            <div className="flex gap-2">
              <a href={`tel:${order.customer_phone}`}
                className="flex-1 h-9 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-200 flex items-center justify-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-800">
                <Phone size={14} /> اتصال
              </a>
              <a href={whatsappUrl(order.customer_phone, buildOrderMessage(order))} target="_blank" rel="noreferrer"
                className="flex-1 h-9 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium flex items-center justify-center gap-2">
                <MessageCircle size={14} /> رسالة واتساب للعميل
              </a>
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            {order.items.map((it, i) => (
              <div key={it.id} className={`flex items-center justify-between gap-3 px-4 py-3 text-sm ${i > 0 ? 'border-t border-gray-100 dark:border-gray-800' : ''}`}>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-white truncate">{it.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{it.quantity} × {fmt(it.unit_price)} ج</p>
                </div>
                <span className="font-bold text-gray-900 dark:text-white flex-shrink-0">{fmt(it.quantity * it.unit_price)} ج</span>
              </div>
            ))}
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-100/60 dark:bg-gray-800">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">الإجمالي</span>
              <span className="text-base font-bold text-gray-900 dark:text-white">{fmt(order.total)} ج</span>
            </div>
          </div>

          {order.status === 'completed' && order.sale_invoice_id && (
            <div className="rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10 p-4 text-sm space-y-1">
              <p className="font-semibold text-green-700 dark:text-green-400">اتسلّم وتم إنشاء فاتورة بيع</p>
              <p className="text-gray-700 dark:text-gray-300">المبلغ المستلم: <span className="font-bold">{fmt(order.paid_amount)} ج</span></p>
              {order.paid_amount < order.total && (
                <p className="text-gray-700 dark:text-gray-300">المتبقي على العميل: <span className="font-bold text-red-600">{fmt(order.total - order.paid_amount)} ج</span></p>
              )}
            </div>
          )}

          {showDelivery && (
            <DeliveryForm
              total={order.total}
              loading={delivering}
              error={deliveryError}
              onSubmit={input => void handleDeliver(input)}
              onCancel={() => setShowDelivery(false)}
            />
          )}

          {order.notes && (
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">ملاحظات العميل</p>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{order.notes}</p>
            </div>
          )}
        </div>

        {canEdit && !showDelivery && NEXT_ACTIONS[order.status].length > 0 && (
          <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-800 flex gap-2">
            {NEXT_ACTIONS[order.status].map(a => (
              <Button key={a.status} variant={a.variant} className="flex-1" loading={saving}
                onClick={() => a.status === 'completed' ? setShowDelivery(true) : onChangeStatus(a.status)}>
                {a.label}
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
