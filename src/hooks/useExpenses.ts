// src/hooks/useExpenses.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { expensesService, type ExpenseFormData } from '@/services/expenses.service'

const KEYS = {
  all:        ['expenses']         as const,
  stats:      ['expenses', 'stats'] as const,
  categories: ['expense_categories'] as const,
}

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: KEYS.all })
  void qc.invalidateQueries({ queryKey: KEYS.stats })
}

export function useExpenses() {
  return useQuery({ queryKey: KEYS.all, queryFn: expensesService.getAll })
}

export function useExpenseStats() {
  return useQuery({ queryKey: KEYS.stats, queryFn: expensesService.getStats })
}

export function useExpenseCategories() {
  return useQuery({
    queryKey: KEYS.categories,
    queryFn:  expensesService.getCategories,
    staleTime: 5 * 60_000,
  })
}

export function useCreateExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (form: ExpenseFormData) => expensesService.create(form),
    onSuccess:  () => invalidateAll(qc),
  })
}

export function useUpdateExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, form }: { id: string; form: Partial<ExpenseFormData> }) =>
      expensesService.update(id, form),
    onSuccess: () => invalidateAll(qc),
  })
}

export function useDeleteExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => expensesService.remove(id),
    onSuccess:  () => invalidateAll(qc),
  })
}

export function useCreateExpenseCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => expensesService.createCategory(name),
    onSuccess:  () => void qc.invalidateQueries({ queryKey: KEYS.categories }),
  })
}
