// src/pages/catalog/CompareModal.tsx
import { X } from 'lucide-react'
import { fmt } from '@/lib/fmt'
import type { CatalogEntry } from '@/services/catalog.service'

export function CompareModal({ entries, onClose }: { entries: CatalogEntry[]; onClose: () => void }) {
  const labels = entries[0]?.specs.map(s => s.label) ?? []

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center sm:p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div dir="rtl" className="bg-white dark:bg-gray-900 w-full sm:max-w-3xl rounded-t-3xl sm:rounded-3xl max-h-[92vh] overflow-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-gray-800">
          <h2 className="font-bold text-gray-900 dark:text-white">مقارنة الموبايلات</h2>
          <button onClick={onClose} aria-label="إغلاق"
            className="w-8 h-8 rounded-lg border border-slate-200 dark:border-gray-700 flex items-center justify-center text-gray-500">
            <X size={14} />
          </button>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="w-24" />
              {entries.map(e => (
                <th key={e.key} className="p-4 align-top text-center">
                  <div className="h-24 flex items-center justify-center mb-2">
                    {e.image && <img src={e.image} alt="" className="max-h-full max-w-full object-contain" />}
                  </div>
                  <p className="font-semibold text-gray-900 dark:text-white">{e.title}</p>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-slate-100 dark:border-gray-800">
              <td className="px-4 py-3 text-slate-500 dark:text-gray-400">السعر</td>
              {entries.map(e => (
                <td key={e.key} className="px-4 py-3 text-center font-bold text-gray-900 dark:text-white">{fmt(e.price)} ج</td>
              ))}
            </tr>
            {labels.map((label, i) => (
              <tr key={label} className="border-t border-slate-100 dark:border-gray-800">
                <td className="px-4 py-3 text-slate-500 dark:text-gray-400">{label}</td>
                {entries.map(e => (
                  <td key={e.key} className="px-4 py-3 text-center text-gray-900 dark:text-white">{e.specs[i]?.value ?? '—'}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
