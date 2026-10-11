// src/pages/catalog/BrandWordmark.tsx
// شعار اسم المحل: خط كوفي + تدرّج ذهبي + سطر لاتيني متباعد
import { Store } from 'lucide-react'
import { cn } from '@/lib/cn'

const GOLD = 'bg-gradient-to-b from-amber-300 via-amber-500 to-amber-700 bg-clip-text text-transparent'

export function BrandWordmark({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  const dark = tone === 'dark'
  return (
    <div className="flex items-center gap-3">
      <div className={cn(
        'w-11 h-11 rounded-xl flex items-center justify-center border',
        dark ? 'bg-white/5 border-amber-400/40' : 'bg-slate-900 border-amber-500/60',
      )}>
        <Store size={20} className="text-amber-400" />
      </div>
      <div className="leading-none">
        <p
          className={cn('text-[26px] font-bold pb-1', GOLD)}
          style={{ fontFamily: "'Reem Kufi', 'Cairo', sans-serif" }}
        >
          الشافعي ستور
        </p>
        <p
          dir="ltr"
          className={cn(
            'text-[9px] font-semibold tracking-[0.42em] uppercase',
            dark ? 'text-slate-400' : 'text-slate-500',
          )}
        >
          Al-Shafei Store
        </p>
      </div>
    </div>
  )
}
