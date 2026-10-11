// src/repositories/catalogReport.repository.ts
import { supabase } from '@/lib/supabase'
import type { CatalogReport } from '@/types/database'

export const catalogReportRepository = {
  get: async (days: number): Promise<CatalogReport> => {
    const { data, error } = await supabase.rpc('get_catalog_report', { p_days: days } as never)
    if (error) throw error
    return data as CatalogReport
  },
}
