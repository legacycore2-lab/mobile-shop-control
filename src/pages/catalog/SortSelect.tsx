// src/pages/catalog/SortSelect.tsx
import { ArrowUpDown } from 'lucide-react'
import { SORT_OPTIONS, type CatalogSort } from '@/services/catalog.service'

export function SortSelect({ value, onChange }: { value: CatalogSort; onChange: (v: CatalogSort) => void }) {
  return (
    <label className="h-10 px-4 rounded-full border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
      <ArrowUpDown size={14} className="text-slate-400" />
      <select value={value} onChange={e => onChange(e.target.value as CatalogSort)}
        className="bg-transparent focus:outline-none cursor-pointer">
        {SORT_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
      </select>
    </label>
  )
}
