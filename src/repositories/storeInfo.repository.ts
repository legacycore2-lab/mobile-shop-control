// src/repositories/storeInfo.repository.ts
import { supabase } from '@/lib/supabase'
import type { StoreInfo } from '@/types/database'

export const storeInfoRepository = {
  get: async (): Promise<StoreInfo> => {
    const { data, error } = await supabase
      .from('store_info')
      .select('whatsapp, phone, address, working_hours, map_url')
      .eq('id', 1)
      .single()
    if (error) throw error
    return data as StoreInfo
  },

  update: async (info: StoreInfo): Promise<void> => {
    const { error } = await supabase
      .from('store_info')
      .update({ ...info, updated_at: new Date().toISOString() } as never)
      .eq('id', 1)
    if (error) throw error
  },
}
