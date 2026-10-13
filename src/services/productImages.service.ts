// src/services/productImages.service.ts
import { productImagesRepository } from '@/repositories/productImages.repository'
import type { ProductImageRow } from '@/types/productImages'

export const productImagesService = {

  getAll: async (): Promise<ProductImageRow[]> => {
    const records = await productImagesRepository.getActiveProducts()
    return records
      .map(r => ({ id: r.id, name: r.name, category: r.category, imageUrl: r.image_url, stockQty: r.stock_qty, unit: r.unit }))
      .sort((a, b) => a.category.localeCompare(b.category, 'ar') || a.name.localeCompare(b.name, 'ar', { numeric: true }))
  },

  setImage: (productId: string, imageUrl: string | null): Promise<void> => {
    if (!productId) throw new Error('المنتج غير محدد')
    return productImagesRepository.setImage(productId, imageUrl)
  },
}
