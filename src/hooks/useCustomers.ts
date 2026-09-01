import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { customersService, type CustomerFormData } from '@/services/customers.service'

const KEYS = {
  all:   ['customers']          as const,
  stats: ['customers', 'stats'] as const,
  one:   (id: string) => ['customers', id] as const,
}

export function useCustomers() {
  return useQuery({
    queryKey: KEYS.all,
    queryFn:  customersService.getAll,
  })
}

export function useCustomerStats() {
  return useQuery({
    queryKey: KEYS.stats,
    queryFn:  customersService.getStats,
  })
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: KEYS.one(id),
    queryFn:  () => customersService.getById(id),
    enabled:  !!id,
  })
}

export function useCreateCustomer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (form: CustomerFormData) => customersService.create(form),
    onSuccess:  () => qc.invalidateQueries({ queryKey: KEYS.all }),
  })
}

export function useUpdateCustomer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, form }: { id: string; form: Partial<CustomerFormData> }) =>
      customersService.update(id, form),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  })
}

export function useDeleteCustomer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => customersService.remove(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: KEYS.all }),
  })
}
