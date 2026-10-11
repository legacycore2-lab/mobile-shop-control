// src/pages/catalog/BrandMark.tsx
// شعار الماركة داخل مربع أبيض، أو الحرف الأول لو مفيش شعار
import { cn } from '@/lib/cn'
import { getBrandLogo } from '@/lib/brandLogos'

interface Props {
  brand: string
  size:  'sm' | 'md'
}

const BOX: Record<Props['size'], string> = {
  sm: 'w-11 h-6 rounded-md p-1',
  md: 'w-12 h-12 rounded-xl p-2',
}

export function BrandMark({ brand, size }: Props) {
  const logo = getBrandLogo(brand)
  return (
    <span className={cn(
      'bg-white border border-slate-200 flex items-center justify-center flex-shrink-0 overflow-hidden',
      BOX[size],
    )}>
      {logo ? (
        <img src={logo} alt={brand} className="max-w-full max-h-full object-contain" />
      ) : (
        <span className="font-bold text-blue-700 text-sm" dir="ltr">{brand.charAt(0).toUpperCase()}</span>
      )}
    </span>
  )
}
