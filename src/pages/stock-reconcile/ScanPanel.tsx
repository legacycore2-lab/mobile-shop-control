// src/pages/stock-reconcile/ScanPanel.tsx
import { useEffect, useRef, useState } from 'react'
import { Plus, ScanLine, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { cn } from '@/lib/cn'
import { normalizeCode, parseCodes } from '@/services/stockReconcile.service'

export interface ScanFeedback {
  tone: 'success' | 'warning' | 'danger' | 'info'
  text: string
}

interface Props {
  scannedCount: number
  feedback:     ScanFeedback | null
  disabled:     boolean
  onAdd:        (codes: string[]) => void
  onClear:      () => void
}

const TONE: Record<ScanFeedback['tone'], string> = {
  success: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800',
  warning: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800',
  danger:  'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800',
  info:    'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800',
}

export function ScanPanel({ scannedCount, feedback, disabled, onAdd, onClear }: Props) {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (!disabled) inputRef.current?.focus() }, [disabled])

  // لو السكانر كتب والفوكس مش على الخانة (بعد الضغط على زرار مثلاً) — الكود لازم يدخل الخانة
  // مش يفتح بطاقة الجهاز اللي بيفتحها الماسح العام في App. بنمسك أول حرف في مرحلة الـ capture
  useEffect(() => {
    if (disabled) return
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (e.ctrlKey || e.metaKey || e.altKey || e.key.length !== 1) return
      e.preventDefault()
      e.stopPropagation()
      setValue(normalizeCode(e.key))
      inputRef.current?.focus()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [disabled])

  function submit() {
    const codes = parseCodes(value)
    if (codes.length) onAdd(codes)
    setValue('')
    inputRef.current?.focus()
  }

  // لصق قايمة أكواد (كل كود في سطر) من إكسل أو غيره
  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData('text')
    if (!/[\s,;]/.test(text.trim())) return
    e.preventDefault()
    onAdd(parseCodes(text))
    setValue('')
  }

  return (
    <Card>
      <CardHeader
        title="امسح الموبايلات اللي عندك فعلاً"
        subtitle="امسح الـ IMEI أو الـ QR بالسكانر لكل جهاز موجود قدامك، أو الصق قايمة أكواد"
        actions={
          scannedCount > 0 ? (
            <Button size="sm" variant="ghost" icon={<Trash2 size={14} />} onClick={onClear}>مسح الكل</Button>
          ) : undefined
        }
      />

      <div className="flex gap-2">
        <div className="relative flex-1">
          <ScanLine size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            disabled={disabled}
            value={value}
            onChange={e => setValue(normalizeCode(e.target.value))}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submit() } }}
            onPaste={handlePaste}
            placeholder="امسح أو اكتب IMEI واضغط Enter"
            className="w-full h-11 pr-9 pl-3 text-base font-mono rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
        </div>
        <Button variant="primary" size="lg" icon={<Plus size={16} />} disabled={disabled || !value.trim()} onClick={submit}>
          إضافة
        </Button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <span className="text-sm text-gray-600 dark:text-gray-300">
          اتمسح: <span className="font-bold text-gray-900 dark:text-white">{scannedCount}</span> كود
        </span>
        {feedback && (
          <span className={cn('px-3 py-1 rounded-lg border text-sm font-medium', TONE[feedback.tone])}>{feedback.text}</span>
        )}
      </div>
    </Card>
  )
}
