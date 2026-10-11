// src/services/storeInfo.service.ts
import { storeInfoRepository } from '@/repositories/storeInfo.repository'
import type { StoreInfo } from '@/types/database'

const PHONE_RE = /^\d{8,15}$/

export const storeInfoService = {
  get: (): Promise<StoreInfo> => storeInfoRepository.get(),

  update: async (info: StoreInfo): Promise<void> => {
    const clean: StoreInfo = {
      whatsapp:      info.whatsapp.replace(/\s|-/g, ''),
      phone:         info.phone.replace(/\s|-/g, ''),
      address:       info.address.trim(),
      working_hours: info.working_hours.trim(),
      map_url:       info.map_url.trim(),
    }
    if (clean.whatsapp && !PHONE_RE.test(clean.whatsapp)) throw new Error('رقم الواتساب غير صحيح')
    if (clean.phone    && !PHONE_RE.test(clean.phone))    throw new Error('رقم الهاتف غير صحيح')
    if (clean.map_url  && !/^https?:\/\//.test(clean.map_url)) throw new Error('رابط الخريطة لازم يبدأ بـ https://')
    return storeInfoRepository.update(clean)
  },
}
