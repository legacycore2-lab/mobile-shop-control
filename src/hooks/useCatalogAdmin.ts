// src/hooks/useCatalogAdmin.ts
// تقييمات وتقرير الكتالوج (لوحة الطلبات)
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { catalogReviewsService } from '@/services/catalogReviews.service'
import { catalogReportService } from '@/services/catalogReport.service'
import type { ReviewStatus } from '@/types/database'

export function useCatalogReviews() {
  return useQuery({ queryKey: ['catalog_reviews'], queryFn: catalogReviewsService.getAll })
}

export function useSetReviewStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ReviewStatus }) => catalogReviewsService.setStatus(id, status),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['catalog_reviews'] })
      void qc.invalidateQueries({ queryKey: ['catalog', 'public'] })
    },
  })
}

export function useCatalogReport(days: number) {
  return useQuery({ queryKey: ['catalog_report', days], queryFn: () => catalogReportService.get(days) })
}
