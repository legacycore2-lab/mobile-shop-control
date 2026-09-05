// src/pages/products/ProductDrawer.tsx
import { X, Package, AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/cn'
import { TYPE_MAP, fmt } from './constants'
import type { ProductWithCategory } from '@/repositories/products.repository'

export function ProductDrawer({ product: p, onClose }: { product: ProductWithCategory; onClose: () => void }) {
  const isLow = p.stock_qty <= p.reorder_level

  const rows: { label: string; value: string | number | null | undefined }[] = [
    { label: 'الاسم',           value: p.name },
    { label: 'التصنيف',         value: p.category_name },
    { label: 'النوع',           value: TYPE_MAP[p.product_type]?.label ?? p.product_type },
    { label: 'SKU',             value: p.sku ?? '—' },
    { label: 'الباركود',        value: p.barcode ?? '—' },
    { label: 'الوحدة',          value: p.unit },
    { label: 'سعر الشراء',      value: `${fmt(p.cost_price)} ج` },
    { label: 'سعر البيع',       value: `${fmt(p.selling_price)} ج` },
    { label: 'الكمية في المخزون', value: `${p.stock_qty} ${p.unit}` },
    { label: 'حد إعادة الطلب',  value: `${p.reorder_level} ${p.unit}` },
    { label: 'المورد الافتراضي', value: p.supplier_name ?? '—' },
  ]

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-end"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-md h-full bg-white dark:bg-gray-900 shadow-2xl flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center">
              <Package size={18} className="text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="font-bold text-gray-900 dark:text-white text-sm">{p.name}</p>
              <p className="text-xs text-gray-400 dark:text-gray-600">{p.category_name}</p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <X size={14} />
          </button>
        </div>

        {/* Status Bar */}
        <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3 flex-wrap">
          <Badge variant={TYPE_MAP[p.product_type]?.variant ?? 'default'}>
            {TYPE_MAP[p.product_type]?.label ?? p.product_type}
          </Badge>
          <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border',
            p.is_active
              ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-500 border-gray-200 dark:border-gray-700')}>
            <span className={cn('w-1.5 h-1.5 rounded-full', p.is_active ? 'bg-green-500' : 'bg-gray-400')} />
            {p.is_active ? 'نشط' : 'موقوف'}
          </span>
          {isLow && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800">
              <AlertTriangle size={10} /> مخزون منخفض
            </span>
          )}
        </div>

        {/* Details */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            {rows.map(({ label, value }, i) => (
              <div key={label} className={cn(
                'flex items-center justify-between px-4 py-3 text-sm',
                i > 0 && 'border-t border-gray-100 dark:border-gray-800',
              )}>
                <span className="text-gray-500 dark:text-gray-400">{label}</span>
                <span className="font-semibold text-gray-900 dark:text-white text-left">{value}</span>
              </div>
            ))}
          </div>

          {(p as unknown as {notes?: string}).notes && (
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">ملاحظات</p>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{(p as unknown as {notes?: string}).notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
