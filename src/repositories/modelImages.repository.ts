// src/repositories/modelImages.repository.ts
import { supabase } from '@/lib/supabase'

export interface ModelImageRecord {
  id:        string
  name:      string
  image_url: string | null
  image_url_2: string | null
  brand:     string
  inStock:   number
}

export const modelImagesRepository = {

  // الموديلات اللي ليها أجهزة في المخزون (مع اسم الماركة وعدد المتاح)
  getModelsInStock: async (): Promise<ModelImageRecord[]> => {
    const { data, error } = await supabase
      .from('mobile_models')
      .select('id, name, image_url, image_url_2, mobile_brands!brand_id ( name ), mobile_devices!inner ( id )')
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
        image_url_2: (r['image_url_2'] as string | null) ?? null,
        brand:     String(brand?.['name'] ?? '—'),
        inStock:   devices.length,
      }
    })
  },

  setImage: async (modelId: string, slot: 1 | 2, imageUrl: string | null): Promise<void> => {
    const patch = slot === 1 ? { image_url: imageUrl } : { image_url_2: imageUrl }
    const { error } = await supabase
      .from('mobile_models')
      .update(patch as never)
      .eq('id', modelId)
    if (error) throw error
  },
}
