// src/repositories/catalogReviews.repository.ts
import { supabase } from '@/lib/supabase'
import type { CatalogReviewRow, ReviewStatus } from '@/types/database'

export const catalogReviewsRepository = {
  getAll: async (): Promise<CatalogReviewRow[]> => {
    const { data, error } = await supabase
      .from('catalog_reviews')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)
    if (error) throw error
    return (data ?? []) as CatalogReviewRow[]
  },

  setStatus: async (id: string, status: ReviewStatus): Promise<void> => {
    const { error } = await supabase
      .from('catalog_reviews')
      .update({ status } as never)
      .eq('id', id)
    if (error) throw error
  },
}
