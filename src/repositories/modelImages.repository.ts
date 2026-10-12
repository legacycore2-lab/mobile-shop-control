// src/repositories/modelImages.repository.ts
import { supabase } from '@/lib/supabase'

export interface ModelImageRecord {
  id:        string
  name:      string
  image_url: string | null
  brand:     string
  inStock:   number
}

export const modelImagesRepository = {

  // الموديلات اللي ليها أجهزة في المخزون (مع اسم الماركة وعدد المتاح)
  getModelsInStock: async (): Promise<ModelImageRecord[]> => {
    const { data, error } = await supabase
      .from('mobile_models')
      .select('id, name, image_url, mobile_brands!brand_id ( name ), mobile_devices!inner ( id )')
      .eq('mobile_devices.status', 'in_stock')
      .limit(1000)
    if (error) throw error

    return ((data ?? []) as unknown[]).map(row => {
      const r       = row as Record<string, unknown>
      const brand   = r['mobile_brands'] as Record<string, unknown> | null
      const devices = (r['mobile_devices'] as unknown[] | null) ?? []
      return {
        id:        String(r['id']),
        name:      String(r['name']),
        image_url: (r['image_url'] as string | null) ?? null,
        brand:     String(brand?.['name'] ?? '—'),
        inStock:   devices.length,
      }
    })
  },

  setImage: async (modelId: string, imageUrl: string | null): Promise<void> => {
    const { error } = await supabase
      .from('mobile_models')
      .update({ image_url: imageUrl } as never)
      .eq('id', modelId)
    if (error) throw error
  },
}
