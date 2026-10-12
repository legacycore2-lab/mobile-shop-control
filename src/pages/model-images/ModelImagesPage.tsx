// src/pages/model-images/ModelImagesPage.tsx
import { useMemo, useState } from 'react'
import { AlertCircle } from 'lucide-react'
import { useModelImages, useSetModelImage } from '@/hooks/useModelImages'
import { ImageField } from '@/components/shared/ImageField'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'

export function ModelImagesPage() {
  const { data = [], isLoading, isError, refetch } = useModelImages()
  const setImage = useSetModelImage()
  const [onlyMissing, setOnlyMissing] = useState(true)

  const withImage = data.filter(m => m.imageUrl).length
  const visible   = useMemo(
    () => (onlyMissing ? data.filter(m => !m.imageUrl) : data),
    [data, onlyMissing],
  )

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">صور الموديلات</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            الصورة بتظهر في الكتالوج لكل أجهزة الموديل — {withImage} من {data.length} موديل ليه صورة
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant={onlyMissing ? 'primary' : 'secondary'} onClick={() => setOnlyMissing(true)}>
            بدون صورة
          </Button>
          <Button size="sm" variant={!onlyMissing ? 'primary' : 'secondary'} onClick={() => setOnlyMissing(false)}>
            الكل
          </Button>
        </div>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {[0, 1, 2, 3, 4, 5, 6, 7].map(i => (
            <div key={i} className="h-32 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
          ))}
        </div>
      )}

      {isError && (
        <Card>
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <AlertCircle size={28} className="text-red-500" />
            <p className="text-sm text-gray-600 dark:text-gray-300">تعذّر تحميل الموديلات</p>
            <Button size="sm" variant="secondary" onClick={() => void refetch()}>إعادة المحاولة</Button>
          </div>
        </Card>
      )}

      {!isLoading && !isError && visible.length === 0 && (
        <Card>
          <p className="text-sm text-center text-gray-500 dark:text-gray-400 py-6">
            {data.length === 0 ? 'مفيش أجهزة في المخزون' : 'كل الموديلات ليها صور'}
          </p>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {visible.map(m => (
          <Card key={m.id} className={cn('flex flex-col gap-3')}>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 dark:text-gray-400" dir="ltr">{m.brand}</p>
              <p className="text-base font-bold text-gray-900 dark:text-white truncate" dir="auto">{m.name}</p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">{m.inStock} في المخزون</p>
            </div>
            <ImageField
              value={m.imageUrl}
              folder="models"
              label="الصورة"
              onChange={url => setImage.mutate({ modelId: m.id, imageUrl: url })}
            />
          </Card>
        ))}
      </div>
    </div>
  )
}
