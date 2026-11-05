// src/components/shared/LabelSettingsPanel.tsx
// ── إعدادات مقاس الليبل واتجاه الطباعة — بتتحفظ على الجهاز وبتأثر على كل طباعة ──

import { useState } from 'react'
import { Settings2 } from 'lucide-react'
import {
  DEFAULT_LABEL_SETTINGS, loadLabelSettings, saveLabelSettings,
  type LabelPrintSettings,
} from '@/lib/printBarcodeLabel'

const ROTATIONS: LabelPrintSettings['rotation'][] = [0, 90, 180, 270]

export function LabelSettingsPanel() {
  const [open, setOpen] = useState(false)
  const [settings, setSettings] = useState<LabelPrintSettings>(loadLabelSettings)

  function update(patch: Partial<LabelPrintSettings>) {
    const next = { ...settings, ...patch }
    setSettings(next)
    saveLabelSettings(next)
  }

  const inputCls =
    'w-full h-9 px-2 text-sm text-center rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white'

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800"
      >
        <span className="flex items-center gap-2">
          <Settings2 size={14} /> إعدادات الليبل — {settings.width} × {settings.height} mm
          {settings.rotation !== 0 ? ` · تدوير ${settings.rotation}°` : ''}
        </span>
        <span>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="p-3 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
              <span>العرض (mm)</span>
              <input
                type="number" inputMode="decimal" min={15} max={120} step={0.5}
                value={settings.width} className={inputCls}
                onChange={e => update({ width: Number(e.target.value) })}
              />
            </label>
            <label className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
              <span>الطول (mm)</span>
              <input
                type="number" inputMode="decimal" min={10} max={120} step={0.5}
                value={settings.height} className={inputCls}
                onChange={e => update({ height: Number(e.target.value) })}
              />
            </label>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-gray-500 dark:text-gray-400">تدوير الطباعة (لو الليبل بيطلع مقلوب أو بالعرض)</span>
            <div className="grid grid-cols-4 gap-1.5">
              {ROTATIONS.map(r => (
                <button
                  key={r} type="button" onClick={() => update({ rotation: r })}
                  className={`h-9 text-sm font-semibold rounded-lg border transition-colors ${
                    settings.rotation === r
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >{r}°</button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => update(DEFAULT_LABEL_SETTINGS)}
            className="text-xs text-gray-400 hover:text-gray-600 underline"
          >رجوع للإعدادات الأصلية</button>
        </div>
      )}
    </div>
  )
}
