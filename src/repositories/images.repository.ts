// src/repositories/images.repository.ts
import { supabase } from '@/lib/supabase'

const BUCKET = 'catalog-images'

export const imagesRepository = {
  upload: async (path: string, file: Blob): Promise<string> => {
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false, cacheControl: '31536000' })
    if (error) throw error
    return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
  },
}
