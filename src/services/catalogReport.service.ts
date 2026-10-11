// src/services/catalogReport.service.ts
import { catalogReportRepository } from '@/repositories/catalogReport.repository'
import type { CatalogReport } from '@/types/database'

export interface CatalogReportView extends CatalogReport {
  conversionPercent: number
}

export const catalogReportService = {
  get: async (days: number): Promise<CatalogReportView> => {
    const r = await catalogReportRepository.get(days)
    return { ...r, conversionPercent: r.visitors > 0 ? Math.round((r.orders / r.visitors) * 1000) / 10 : 0 }
  },
}
