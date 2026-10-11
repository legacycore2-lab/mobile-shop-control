// src/pages/catalog/ContactButtons.tsx
// أزرار عائمة: اتصال + واتساب (بتظهر لو الرقم متسجّل في بيانات المحل)
import { MessageCircle, Phone } from 'lucide-react'
import { whatsappUrl } from '@/lib/whatsapp'
import type { StoreInfo } from '@/types/database'

export function ContactButtons({ store }: { store: StoreInfo | null }) {
  if (!store || (!store.whatsapp && !store.phone)) return null
  return (
    <div className="fixed bottom-5 left-5 z-40 flex flex-col gap-3">
      {store.phone && (
        <a href={`tel:${store.phone}`} aria-label="اتصل بينا"
          className="h-14 pl-5 pr-4 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg flex items-center gap-2 text-sm font-semibold transition-colors">
          <Phone size={22} />
          <span className="hidden sm:inline">اتصل بينا</span>
        </a>
      )}
      {store.whatsapp && (
        <a href={whatsappUrl(store.whatsapp, 'مرحبًا، عندي استفسار عن البضاعة في الشافعي ستور')}
          target="_blank" rel="noreferrer" aria-label="تواصل واتساب"
          className="h-14 pl-5 pr-4 rounded-full bg-green-500 hover:bg-green-600 text-white shadow-lg flex items-center gap-2 text-sm font-semibold transition-colors">
          <MessageCircle size={22} />
          <span className="hidden sm:inline">كلمنا واتساب</span>
        </a>
      )}
    </div>
  )
}
