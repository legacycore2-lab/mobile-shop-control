// src/lib/whatsapp.ts
// تحويل رقم مصري محلي (01xxxxxxxxx) لصيغة واتساب الدولية وبناء رابط المحادثة

export function toWhatsappNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  return digits.startsWith('0') ? `20${digits.slice(1)}` : digits
}

export function whatsappUrl(phone: string, text?: string): string {
  const base = `https://wa.me/${toWhatsappNumber(phone)}`
  return text ? `${base}?text=${encodeURIComponent(text)}` : base
}
