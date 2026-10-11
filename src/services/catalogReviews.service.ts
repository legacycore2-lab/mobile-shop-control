// src/services/catalogReviews.service.ts
import { catalogReviewsRepository } from '@/repositories/catalogReviews.repository'
import type { CatalogReviewRow, ReviewStatus } from '@/types/database'

export const catalogReviewsService = {
  getAll:    (): Promise<CatalogReviewRow[]> => catalogReviewsRepository.getAll(),
  setStatus: (id: string, status: ReviewStatus): Promise<void> => catalogReviewsRepository.setStatus(id, status),
}
