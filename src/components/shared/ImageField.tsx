// src/components/shared/ImageField.tsx
import { useRef, useState } from 'react'
import { ImagePlus, Loader2, X } from 'lucide-react'
import { useImageUpload } from '@/hooks/useImageUpload'

interface Props {
  value:    string | null
  folder:   'products' | 'models' | 'devices'
  label:    string
  onChange: (url: string | null) => void
}

export function ImageField({ value, folder, label, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const upload   = useImageUpload(folder)
  const [error, setError] = useState('')

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError('')
    try {
      onChange(await upload.mutateAsync(file))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل رفع الصورة')
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{label}</span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={upload.isPending}
          className="relative w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex items-center justify-center overflow-hidden hover:border-blue-400 transition-colors flex-shrink-0"
        >
          {upload.isPending
            ? <Loader2 size={20} className="animate-spin text-blue-600" />
            : value
              ? <img src={value} alt="" className="w-full h-full object-contain p-1" />
              : <ImagePlus size={22} className="text-gray-400" />}
        </button>
        <div className="flex flex-col gap-1.5 items-start">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={upload.isPending}
            className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
          >
            {value ? 'تغيير الصورة' : 'رفع صورة'}
          </button>
          {value && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="text-xs text-red-500 hover:underline flex items-center gap-1"
            >
              <X size={12} /> إزالة
            </button>
          )}
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
      </div>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e => void handleFile(e)} />
    </div>
  )
}
