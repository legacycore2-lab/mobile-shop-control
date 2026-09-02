// src/pages/products/StockModal.tsx
import { useState } from 'react'
import { X, Plus, Minus } from 'lucide-react'
import { useAdjustStock } from '@/hooks/useProducts'
import { cn } from '@/lib/cn'
import type { ProductWithCategory } from '@/repositories/products.repository'

export function StockModal({ product, onClose }: { product: ProductWithCategory; onClose: () => void }) {
  const adjustMutation = useAdjustStock()
  const [qty,  setQty]  = useState('')
  const [mode, setMode] = useState<'add' | 'remove'>('add')
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const n = Number(qty)
    if (!n || n <= 0) { setError('أدخل كمية صحيحة أكبر من صفر'); return }
    setError('')
    try {
      await adjustMutation.mutateAsync({ id: product.id, delta: mode === 'add' ? n : -n })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <div>
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">تعديل المخزون</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{product.name}</p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
            <X size={14} />
          </button>
        </div>
        <form onSubmit={e => void handleSubmit(e)} className="px-5 py-4 flex flex-col gap-4">
          {/* Current stock */}
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 flex items-center justify-between">
            <span className="text-xs text-gray-500 dark:text-gray-400">المخزون الحالي</span>
            <span className={cn('text-lg font-bold', product.stock_qty <= product.reorder_level ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white')}>
              {product.stock_qty} {product.unit}
            </span>
          </div>
          {/* Mode */}
          <div className="grid grid-cols-2 gap-2">
            {([['add', 'إضافة'], ['remove', 'خصم']] as const).map(([v, l]) => (
              <button key={v} type="button" onClick={() => setMode(v)}
                className={cn('h-9 text-sm font-semibold rounded-lg border transition-colors',
                  mode === v
                    ? v === 'add'
                      ? 'bg-green-600 border-green-600 text-white'
                      : 'bg-red-600 border-red-600 text-white'
                    : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400')}>
                {v === 'add' ? <Plus size={14} className="inline ml-1" /> : <Minus size={14} className="inline ml-1" />}
                {l}
              </button>
            ))}
          </div>
          {/* Qty input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">الكمية</label>
            <input type="number" min="1" value={qty} onChange={e => setQty(e.target.value)}
              placeholder="أدخل الكمية" autoFocus
              className="h-10 border border-gray-200 dark:border-gray-700 rounded-lg px-3 text-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all" />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={onClose}
              className="h-9 px-4 text-sm font-medium rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              إلغاء
            </button>
            <button type="submit" disabled={adjustMutation.isPending}
              className={cn('h-9 px-5 text-sm font-semibold rounded-lg text-white transition-colors disabled:opacity-50 flex items-center gap-2',
                mode === 'add' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700')}>
              {adjustMutation.isPending && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              تأكيد
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Product Form Modal ────────────────────────────────────────────────────────

