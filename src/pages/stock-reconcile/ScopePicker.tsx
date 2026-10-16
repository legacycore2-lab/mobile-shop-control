// src/pages/stock-reconcile/ScopePicker.tsx
import { useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import type { ScopeModel } from '@/types/stockReconcile'

interface Props {
  models:   ScopeModel[]
  selected: string[]
  onChange: (next: string[]) => void
}

const ALL_OF_BRAND = '__all__'

const SELECT = 'h-10 w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:border-blue-500 disabled:opacity-50'

// اختيار الموديلات اللي فيها المشكلة: الماركة ثم الموديل — لو مفيش اختيار المطابقة بتشمل كل الأنواع
export function ScopePicker({ models, selected, onChange }: Props) {
  const [brand, setBrand] = useState('')

  const selectedSet     = useMemo(() => new Set(selected), [selected])
  const selectedModels  = models.filter(m => selectedSet.has(m.key))
  const selectedDevices = selectedModels.reduce((s, m) => s + m.in_stock, 0)

  const brands = useMemo(() => {
    const counts = new Map<string, number>()
    for (const m of models) counts.set(m.brand_name, (counts.get(m.brand_name) ?? 0) + m.in_stock)
    return Array.from(counts, ([name, count]) => ({ name, count })).sort((a, b) => a.name.localeCompare(b.name, 'ar'))
  }, [models])

  // موديلات الماركة المختارة اللي لسه ماتضافتش
  const brandModels = useMemo(
    () => models.filter(m => m.brand_name === brand && !selectedSet.has(m.key)),
    [models, brand, selectedSet],
  )

  function handleModelPick(value: string) {
    if (!value) return
    const keys = value === ALL_OF_BRAND ? brandModels.map(m => m.key) : [value]
    onChange(Array.from(new Set([...selected, ...keys])))
  }

  return (
    <Card>
      <CardHeader
        title="الأنواع اللي هتتطابق"
        subtitle={selectedModels.length === 0
          ? 'كل الموديلات — اختار الماركة ثم الموديل لو المشكلة في أنواع معينة بس'
          : `${selectedModels.length} موديل · ${selectedDevices} جهاز في النظام`}
        actions={selectedModels.length > 0
          ? <Button size="sm" variant="ghost" onClick={() => onChange([])}>مسح الاختيار (الكل)</Button>
          : undefined}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">الماركة</span>
          <select value={brand} onChange={e => setBrand(e.target.value)} className={SELECT}>
            <option value="">اختار الماركة…</option>
            {brands.map(b => <option key={b.name} value={b.name}>{b.name} ({b.count})</option>)}
          </select>
        </label>

        <label className="block">
          <span className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">الموديل</span>
          <select value="" onChange={e => handleModelPick(e.target.value)} disabled={!brand || brandModels.length === 0} className={SELECT}>
            <option value="">
              {!brand ? 'اختار الماركة الأول' : brandModels.length === 0 ? 'كل موديلات الماركة مضافة' : 'اختار الموديل…'}
            </option>
            {brandModels.length > 1 && <option value={ALL_OF_BRAND}>كل موديلات {brand}</option>}
            {brandModels.map(m => <option key={m.key} value={m.key}>{m.model_name} ({m.in_stock})</option>)}
          </select>
        </label>
      </div>

      {selectedModels.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {selectedModels.map(m => (
            <span key={m.key} className="inline-flex items-center gap-1.5 h-8 ps-3 pe-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-sm font-medium">
              {m.label} ({m.in_stock})
              <button type="button" aria-label={`شيل ${m.label}`} onClick={() => onChange(selected.filter(k => k !== m.key))}
                className="w-5 h-5 rounded-md flex items-center justify-center hover:bg-blue-100 dark:hover:bg-blue-900/40">
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
    </Card>
  )
}
