// src/services/modelImages.service.ts
import { modelImagesRepository } from '@/repositories/modelImages.repository'
import type { ModelImageRow } from '@/types/modelImages'

export const modelImagesService = {

  getAll: async (): Promise<ModelImageRow[]> => {
    const records = await modelImagesRepository.getModelsInStock()
    return records
      .map(r => ({ id: r.id, brand: r.brand, name: r.name, imageUrl: r.image_url, imageUrl2: r.image_url_2, inStock: r.inStock }))
      .sort((a, b) => a.brand.localeCompare(b.brand, 'en') || a.name.localeCompare(b.name, 'en', { numeric: true }))
  },

  setImage: (modelId: string, slot: 1 | 2, imageUrl: string | null): Promise<void> => {
    if (!modelId) throw new Error('الموديل غير محدد')
    return modelImagesRepository.setImage(modelId, slot, imageUrl)
  },
}
