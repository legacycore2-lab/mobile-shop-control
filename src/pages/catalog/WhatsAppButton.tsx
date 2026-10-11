// src/pages/catalog/WhatsAppButton.tsx
import { MessageCircle } from 'lucide-react'
import { whatsappUrl } from '@/lib/whatsapp'

export function WhatsAppButton({ number }: { number: string }) {
  if (!number) return null
  return (
    <a
      href={whatsappUrl(number, 'مرحبًا، عندي استفسار عن البضاعة في الشافعي ستور')}
      target="_blank" rel="noreferrer" aria-label="تواصل واتساب"
      className="fixed bottom-5 left-5 z-40 h-14 pl-5 pr-4 rounded-full bg-green-500 hover:bg-green-600 text-white shadow-lg flex items-center gap-2 text-sm font-semibold transition-colors"
    >
      <MessageCircle size={22} />
      <span className="hidden sm:inline">كلمنا واتساب</span>
    </a>
  )
}
