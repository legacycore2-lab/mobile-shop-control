// src/hooks/useStockCount.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { stockCountService } from '@/services/stockCount.service'
import type { AnswerDraft, CreateStockCountInput, StockCountItem } from '@/types/stockCount'

const KEYS = {
  sessions:  ['stock_count', 'sessions']  as const,
  employees: ['stock_count', 'employees'] as const,
  public:    (token: string) => ['stock_count', 'public', token] as const,
}

// شاشة الإدارة — بتتحدث كل نص دقيقة عشان تظهر ردود المسئول أول بأول
export function useStockCountSessions() {
  return useQuery({
    queryKey: KEYS.sessions,
    queryFn:  stockCountService.getSessions,
    refetchInterval: 30_000,
  })
}

export function useStockCountEmployees() {
  return useQuery({
    queryKey: KEYS.employees,
    queryFn:  stockCountService.getEmployees,
    staleTime: 5 * 60_000,
  })
}

export function useCreateStockCount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateStockCountInput) => stockCountService.create(input),
    onSuccess:  () => { void qc.invalidateQueries({ queryKey: KEYS.sessions }) },
  })
}

// الشاشة الخارجية — بالـ token من غير تسجيل دخول
export function usePublicStockCount(token: string) {
  return useQuery({
    queryKey: KEYS.public(token),
    queryFn:  () => stockCountService.getByToken(token),
    retry: false,
  })
}

export function useSubmitStockCount(token: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: { items: StockCountItem[]; drafts: Record<string, AnswerDraft> }) =>
      stockCountService.submit(token, args.items, args.drafts),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: KEYS.public(token) }) },
  })
}
