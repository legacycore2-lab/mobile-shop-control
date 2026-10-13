// src/repositories/productImages.repository.ts
import { supabase } from '@/lib/supabase'

export interface ProductImageRecord {
  id:        string
  name:      string
  image_url: string | null
  stock_qty: number
  unit:      string
  category:  string
}

export const productImagesRepository = {

  getActiveProducts: async (): Promise<ProductImageRecord[]> => {
    const { data, error } = await supabase
      .from('products')
      .select('id, name, image_url, stock_qty, unit, product_categories!category_id ( name )')
      .eq('is_active', true)
      .eq('is_deleted', false)
      .limit(1000)
    if (error) throw error

    return ((data ?? []) as unknown[]).map(row => {
      const r        = row as Record<string, unknown>
      const category = r['product_categories'] as Record<string, unknown> | null
      return {
        id:        String(r['id']),
        name:      String(r['name']),
        image_url: (r['image_url'] as string | null) ?? null,
        stock_qty: Number(r['stock_qty'] ?? 0),
        unit:      String(r['unit'] ?? ''),
        category:  String(category?.['name'] ?? '—'),
      }
    })
  },

  setImage: async (productId: string, imageUrl: string | null): Promise<void> => {
    const { error } = await supabase
      .from('products')
      .update({ image_url: imageUrl } as never)
      .eq('id', productId)
    if (error) throw error
  },
}
