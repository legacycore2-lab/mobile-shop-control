// src/pages/devices/DeviceDrawer.tsx
import { X } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/cn'
import { STATUS_MAP, CONDITION_MAP } from './constants'
import type { MobileDeviceView } from '@/types/database'

export function DeviceDrawer({ device, onClose }: { device: MobileDeviceView; onClose: () => void }) {
  const status = STATUS_MAP[device.status]
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-end"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white dark:bg-gray-900 h-full w-full max-w-sm shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <div>
            <p className="text-base font-bold text-gray-900 dark:text-white">
              {device.brand_name} {device.model_name}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 font-mono mt-0.5">{device.imei1}</p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Status */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500 dark:text-gray-400">الحالة</span>
            <Badge variant={status.variant} dot>{status.label}</Badge>
          </div>

          {/* Specs */}
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 space-y-3">
            <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">المواصفات</p>
            {[
              ['IMEI 1', device.imei1, true],
              ['IMEI 2', device.imei2],
              ['الرقم التسلسلي', device.serial_number],
              ['السعة', device.storage],
              ['اللون', device.color],
              ['الحالة', CONDITION_MAP[device.condition] ?? device.condition],
            ].map(([label, value, mono]) =>
              value ? (
                <div key={String(label)} className="flex items-center justify-between gap-4">
                  <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
                  <span className={cn('text-xs text-gray-900 dark:text-white font-medium', mono && 'font-mono')}>{value}</span>
                </div>
              ) : null
            )}
          </div>

          {/* Purchase */}
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 space-y-3">
            <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">بيانات الشراء</p>
            {[
              ['المورد', device.supplier_name],
              ['تاريخ الشراء', new Date(device.purchase_date).toLocaleDateString('ar-EG')],
              ['سعر الشراء', `${device.cost_price.toLocaleString('ar-EG')} ج.م`],
              ['سعر البيع', device.selling_price ? `${device.selling_price.toLocaleString('ar-EG')} ج.م` : null],
              ['الضمان', device.warranty_months ? `${device.warranty_months} شهر` : null],
              ['انتهاء الضمان', device.warranty_expires_at
                ? new Date(device.warranty_expires_at).toLocaleDateString('ar-EG')
                : null],
            ].map(([label, value]) =>
              value ? (
                <div key={String(label)} className="flex items-center justify-between gap-4">
                  <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
                  <span className="text-xs text-gray-900 dark:text-white font-medium">{value}</span>
                </div>
              ) : null
            )}
          </div>

          {/* Sale info */}
          {device.status === 'sold' && device.customer_name && (
            <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-xl p-4 space-y-3">
              <p className="text-xs font-bold text-green-600 dark:text-green-400 uppercase tracking-widest">بيانات البيع</p>
              {[
                ['العميل', device.customer_name],
                ['تليفون', device.customer_phone],
                ['سعر البيع الفعلي', device.actual_selling_price ? `${device.actual_selling_price.toLocaleString('ar-EG')} ج.م` : null],
                ['تاريخ البيع', device.sold_at ? new Date(device.sold_at).toLocaleDateString('ar-EG') : null],
              ].map(([label, value]) =>
                value ? (
                  <div key={String(label)} className="flex items-center justify-between gap-4">
                    <span className="text-xs text-green-700 dark:text-green-400">{label}</span>
                    <span className="text-xs text-green-900 dark:text-green-200 font-medium">{value}</span>
                  </div>
                ) : null
              )}
            </div>
          )}

          {/* Meta */}
          <div className="text-xs text-gray-400 dark:text-gray-500 space-y-1">
            <p>أضافه: {device.added_by_name}</p>
            <p>بتاريخ: {new Date(device.created_at).toLocaleDateString('ar-EG')}</p>
            {device.location && <p>الموقع: {device.location}</p>}
            {device.notes    && <p>ملاحظات: {device.notes}</p>}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

