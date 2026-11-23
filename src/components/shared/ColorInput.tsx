// src/components/shared/ColorInput.tsx
// خانة اللون مع اقتراحات: ألوان الموديل الرسمية (الأيفون) + ألوان اتسجلت قبل كده + ألوان عامة

import { useMemo, useState } from 'react'
import { useUsedColors } from '@/hooks/useDevices'
import { GENERIC_COLORS, officialColors, type ColorOption } from '@/lib/deviceColors'
import { cn } from '@/lib/cn'

interface Props {
  value:       string
  onChange:    (value: string) => void
  className?:  string
  placeholder?: string
  brandName?:  string
  modelName?:  string
  modelId?:    string
}

const norm = (s: string) => s.trim().toLowerCase()

export function ColorInput({
  value, onChange, className, placeholder = 'أسود...',
  brandName = '', modelName = '', modelId = '',
}: Props) {
  const { data: used = [] } = useUsedColors()
  const [open, setOpen] = useState(false)

  const options = useMemo(() => {
    const official = officialColors(brandName, modelName)
    const query    = norm(value)

    // ألوان اتسجلت قبل كده: الأولى لنفس الموديل، وبعدين الباقي مرتبة بالأكثر استخدامًا
    const counts = new Map<string, { label: string; n: number; sameModel: boolean }>()
    for (const r of used) {
      const key = norm(r.color)
      const cur = counts.get(key) ?? { label: r.color, n: 0, sameModel: false }
      cur.n++
      if (modelId && r.model_id === modelId) cur.sameModel = true
      counts.set(key, cur)
    }
    const usedList: ColorOption[] = [...counts.values()]
      .sort((a, b) => Number(b.sameModel) - Number(a.sameModel) || b.n - a.n)
      .map(u => ({ value: u.label, alias: u.sameModel ? 'اتسجل لنفس الموديل' : '' }))

    const pools: ColorOption[][] = official
      ? (query ? [official, usedList, GENERIC_COLORS] : [official, usedList.filter(u => u.alias)])
      : [usedList, GENERIC_COLORS]

    const seen = new Set<string>()
    const out: ColorOption[] = []
    for (const opt of pools.flat()) {
      const key = norm(opt.value)
      if (seen.has(key)) continue
      if (query && !key.includes(query) && !norm(opt.alias).includes(query) && !norm(opt.keywords ?? '').includes(query)) continue
      seen.add(key)
      out.push(opt)
    }
    // لو المكتوب هو نفس اللون بالظبط مفيش داعي نعرضه تاني
    return out.filter(o => norm(o.value) !== query).slice(0, 15)
  }, [used, value, brandName, modelName, modelId])

  return (
    <div className="relative">
      <input
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={e => { if (e.key === 'Escape') setOpen(false) }}
        placeholder={placeholder}
        autoComplete="off"
        className={className}
      />
      {open && options.length > 0 && (
        <ul
          className={cn(
            'absolute z-50 mt-1 w-full max-h-56 overflow-y-auto rounded-lg border shadow-lg',
            'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 py-1',
          )}
        >
          {options.map(opt => (
            <li key={opt.value}>
              <button
                type="button"
                // mousedown بدل click عشان الـ blur ميقفلش القائمة قبل الاختيار
                onMouseDown={e => { e.preventDefault(); onChange(opt.value); setOpen(false) }}
                className="w-full flex items-center justify-between gap-3 px-3 py-1.5 text-sm text-right text-gray-800 dark:text-gray-100 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
              >
                <span className="font-medium">{opt.value}</span>
                {opt.alias && <span className="text-xs text-gray-400">{opt.alias}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
