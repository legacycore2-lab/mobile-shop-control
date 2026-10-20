// src/hooks/useImport.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { importService } from '@/services/import.service'
import { importTemplateService } from '@/services/importTemplate.service'
import type { ParsedWorkbook } from '@/services/import.service'

interface RunImportInput {
  plan:        ParsedWorkbook
  userId:      string
  onProgress?: (done: number, total: number) => void
}

export function useParseImportFile() {
  return useMutation({
    mutationFn: (file: File) => importService.parseFile(file),
  })
}

export function useBuildImportTemplate() {
  return useMutation({
    mutationFn: () => importTemplateService.build(),
  })
}

export function useRunImport() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ plan, userId, onProgress }: RunImportInput) =>
      importService.runImport(plan, userId, onProgress),
    // الاستيراد ممكن ينجح جزئياً — نحدّث الشاشات في كل الحالات
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ['products'] })
      void qc.invalidateQueries({ queryKey: ['product_categories'] })
      void qc.invalidateQueries({ queryKey: ['devices'] })
      void qc.invalidateQueries({ queryKey: ['mobile_brands'] })
      void qc.invalidateQueries({ queryKey: ['mobile_models'] })
      void qc.invalidateQueries({ queryKey: ['suppliers'] })
      void qc.invalidateQueries({ queryKey: ['purchases'] })
      void qc.invalidateQueries({ queryKey: ['ledger'] })
      void qc.invalidateQueries({ queryKey: ['payments', 'stats'] })
    },
  })
}
