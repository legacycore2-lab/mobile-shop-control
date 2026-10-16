// src/pages/stock-reconcile/ScopePicker.tsx
import { useMemo, useState } from 'react'
import { ChevronDown, Search } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { cn } from '@/lib/cn'
import type { ScopeModel } from '@/types/stockReconcile'

interface Props {
  models:   ScopeModel[]
  selected: string[]
  onChange: (next: string[]) => void
}

interface BrandGroup {
  brand:  string
  models: ScopeModel[]
}

const CHECKBOX = 'w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500'

// اختيار الموديلات اللي فيها المشكلة — لو مفيش اختيار المطابقة بتشمل كل الأنواع
export function ScopePicker({ models, selected, onChange }: Props) {
  const [open,   setOpen]   = useState(false)
  const [search, setSearch] = useState('')

  const selectedSet = useMemo(() => new Set(selected), [selected])
  const selectedModels = models.filter(m => selectedSet.has(m.key))
  const selectedDevices = selectedModels.reduce((s, m) => s + m.in_stock, 0)

  const groups = useMemo<BrandGroup[]>(() => {
    const q = search.trim().toLowerCase()
    const byBrand = new Map<string, ScopeModel[]>()
    for (const m of models) {
      if (q && !m.label.toLowerCase().includes(q)) continue
      byBrand.set(m.brand_name, [...(byBrand.get(m.brand_name) ?? []), m])
    }
    return Array.from(byBrand, ([brand, list]) => ({ brand, models: list }))
  }, [models, search])

  function toggleModel(key: string) {
    onChange(selectedSet.has(key) ? selected.filter(k => k !== key) : [...selected, key])
  }

  function toggleBrand(group: BrandGroup) {
    const keys = group.models.map(m => m.key)
    const allOn = keys.every(k => selectedSet.has(k))
    onChange(allOn ? selected.filter(k => !keys.includes(k)) : Array.from(new Set([...selected, ...keys])))
  }

  return (
    <Card padding={false}>
      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open}
        className="w-full p-4 flex items-center justify-between gap-3 text-start">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">الأنواع اللي هتتطابق</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {selectedModels.length === 0
              ? 'كل الموديلات — اضغط عشان تحدد موديلات معينة بس'
              : `${selectedModels.length} موديل · ${selectedDevices} جهاز في النظام`}
          </p>
        </div>
        <ChevronDown size={16} className={cn('text-gray-400 transition-transform flex-shrink-0', open && 'rotate-180')} />
      </button>

      {!open && selectedModels.length > 0 && (
        <div className="px-4 pb-4 flex flex-wrap gap-2">
          {selectedModels.map(m => (
            <span key={m.key} className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-xs font-medium">
              {m.label} ({m.in_stock})
            </span>
          ))}
        </div>
      )}

      {open && (
        <div className="border-t border-gray-100 dark:border-gray-800 p-4 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-48">
              <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحث عن موديل..."
                className="w-full h-9 pr-8 pl-3 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-blue-500" />
            </div>
            <Button size="sm" variant="ghost" disabled={selected.length === 0} onClick={() => onChange([])}>
              مسح الاختيار (الكل)
            </Button>
          </div>

          {groups.length === 0 && <p className="text-sm text-gray-400">مفيش موديلات مطابقة</p>}

          <div className="space-y-4 max-h-96 overflow-y-auto">
            {groups.map(g => {
              const allOn = g.models.every(m => selectedSet.has(m.key))
              return (
                <div key={g.brand}>
                  <label className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white cursor-pointer">
                    <input type="checkbox" className={CHECKBOX} checked={allOn} onChange={() => toggleBrand(g)} />
                    {g.brand}
                  </label>
                  <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-2 pr-6">
                    {g.models.map(m => (
                      <label key={m.key} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                        <input type="checkbox" className={CHECKBOX} checked={selectedSet.has(m.key)} onChange={() => toggleModel(m.key)} />
                        <span className="flex-1 truncate">{m.model_name}</span>
                        <span className="text-xs text-gray-400">{m.in_stock}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </Card>
  )
}
