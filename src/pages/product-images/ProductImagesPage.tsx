// src/pages/product-images/ProductImagesPage.tsx
import { useMemo, useState } from 'react'
import { AlertCircle } from 'lucide-react'
import { useProductImages, useSetProductImage } from '@/hooks/useProductImages'
import { ImageField } from '@/components/shared/ImageField'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

export function ProductImagesPage() {
  const { data = [], isLoading, isError, refetch } = useProductImages()
  const setImage = useSetProductImage()
  const [onlyMissing, setOnlyMissing] = useState(true)

  const withImage = data.filter(p => p.imageUrl).length
  const visible   = useMemo(
    () => (onlyMissing ? data.filter(p => !p.imageUrl) : data),
    [data, onlyMissing],
  )

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">صور المنتجات</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            الصورة بتظهر في الكتالوج — {withImage} من {data.length} منتج ليه صورة
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant={onlyMissing ? 'primary' : 'secondary'} onClick={() => setOnlyMissing(true)}>
            ناقص صور
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
            <p className="text-sm text-gray-600 dark:text-gray-300">تعذّر تحميل المنتجات</p>
            <Button size="sm" variant="secondary" onClick={() => void refetch()}>إعادة المحاولة</Button>
          </div>
        </Card>
      )}

      {!isLoading && !isError && visible.length === 0 && (
        <Card>
          <p className="text-sm text-center text-gray-500 dark:text-gray-400 py-6">
            {data.length === 0 ? 'مفيش منتجات' : 'كل المنتجات ليها صور'}
          </p>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {visible.map(p => (
          <Card key={p.id} className="flex flex-col gap-3">
            <div className="min-w-0">
              <p className="text-xs text-gray-500 dark:text-gray-400">{p.category}</p>
              <p className="text-base font-bold text-gray-900 dark:text-white truncate" dir="auto">{p.name}</p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">{p.stockQty} {p.unit} في المخزون</p>
            </div>
            <ImageField
              value={p.imageUrl}
              folder="products"
              label="صورة المنتج"
              onChange={url => setImage.mutate({ productId: p.id, imageUrl: url })}
            />
          </Card>
        ))}
      </div>
    </div>
  )
}
