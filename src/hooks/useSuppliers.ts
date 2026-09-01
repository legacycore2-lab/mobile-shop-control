import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { suppliersService, type SupplierFormData } from '@/services/suppliers.service'

const KEYS = {
  all:   ['suppliers']          as const,
  stats: ['suppliers', 'stats'] as const,
  one:   (id: string) => ['suppliers', id] as const,
}

export function useSuppliers() {
  return useQuery({
    queryKey: KEYS.all,
    queryFn:  suppliersService.getAll,
  })
}

export function useSupplierStats() {
  return useQuery({
    queryKey: KEYS.stats,
    queryFn:  suppliersService.getStats,
  })
}

export function useSupplier(id: string) {
  return useQuery({
    queryKey: KEYS.one(id),
    queryFn:  () => suppliersService.getById(id),
    enabled:  !!id,
  })
}

export function useCreateSupplier() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (form: SupplierFormData) => suppliersService.create(form),
    onSuccess:  () => qc.invalidateQueries({ queryKey: KEYS.all }),
  })
}

export function useUpdateSupplier() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, form }: { id: string; form: Partial<SupplierFormData> }) =>
      suppliersService.update(id, form),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  })
}

export function useDeleteSupplier() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => suppliersService.remove(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: KEYS.all }),
  })
}
