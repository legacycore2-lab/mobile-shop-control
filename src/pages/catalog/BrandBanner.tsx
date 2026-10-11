// src/pages/catalog/BrandBanner.tsx
// شريط الاسم الكبير أعلى الكتالوج: اسم المحل بالذهبي في المنتصف + خط فاصل + سطر لاتيني
import { Store } from 'lucide-react'

export function BrandBanner() {
  return (
    <div className="bg-gradient-to-b from-slate-950 to-slate-800 flex flex-col items-center px-4 pt-5 pb-4 sm:pt-6">
      <div className="flex items-center gap-3 sm:gap-4">
        <Store size={26} className="text-amber-400 hidden sm:block" />
        <div
          className="text-[40px] sm:text-[54px] font-bold leading-tight pb-1 bg-gradient-to-b from-amber-300 via-amber-500 to-amber-700 bg-clip-text text-transparent [text-shadow:0_0_28px_rgba(245,158,11,0.25)]"
          style={{ fontFamily: "'Reem Kufi', 'Cairo', sans-serif" }}
        >
          الشافعي ستور
        </div>
        <Store size={26} className="text-amber-400 hidden sm:block" />
      </div>
      <div className="w-44 h-0.5 my-1.5 bg-gradient-to-r from-transparent via-amber-500 to-transparent" />
      <p dir="ltr" className="text-[10px] sm:text-[11px] font-semibold tracking-[0.42em] uppercase text-slate-300">
        Al-Shafei Store
      </p>
    </div>
  )
}
