import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { productsService, type ProductFormData, type CategoryFormData } from '@/services/products.service'

const KEYS = {
  all:        ['products']               as const,
  stats:      ['products', 'stats']      as const,
  one:        (id: string) => ['products', id] as const,
  lowStock:   ['products', 'low_stock']  as const,
  categories: ['product_categories']    as const,
}

// ── Categories ────────────────────────────────────────────────────────────────

export function useProductCategories() {
  return useQuery({
    queryKey: KEYS.categories,
    queryFn:  productsService.getAllCategories,
    staleTime: 5 * 60_000,
  })
}

export function useCreateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (form: CategoryFormData) => productsService.createCategory(form),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.categories }),
  })
}

export function useUpdateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, form }: { id: string; form: Partial<CategoryFormData> }) =>
      productsService.updateCategory(id, form),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEYS.categories })
      void qc.invalidateQueries({ queryKey: KEYS.all })
    },
  })
}

export function useDeleteCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => productsService.removeCategory(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEYS.categories })
      void qc.invalidateQueries({ queryKey: KEYS.all })
    },
  })
}

// ── Products ──────────────────────────────────────────────────────────────────

export function useProducts() {
  return useQuery({
    queryKey: KEYS.all,
    queryFn:  productsService.getAll,
  })
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: KEYS.one(id),
    queryFn:  () => productsService.getById(id),
    enabled:  !!id,
  })
}

export function useProductStats() {
  return useQuery({
    queryKey: KEYS.stats,
    queryFn:  productsService.getStats,
  })
}

export function useLowStockProducts() {
  return useQuery({
    queryKey: KEYS.lowStock,
    queryFn:  productsService.getLowStock,
  })
}

export function useCreateProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (form: ProductFormData) => productsService.create(form),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEYS.all })
      void qc.invalidateQueries({ queryKey: KEYS.stats })
      void qc.invalidateQueries({ queryKey: KEYS.lowStock })
    },
  })
}

export function useUpdateProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, form }: { id: string; form: Partial<ProductFormData> }) =>
      productsService.update(id, form),
    onSuccess: (_data, { id }) => {
      void qc.invalidateQueries({ queryKey: KEYS.all })
      void qc.invalidateQueries({ queryKey: KEYS.one(id) })
      void qc.invalidateQueries({ queryKey: KEYS.stats })
      void qc.invalidateQueries({ queryKey: KEYS.lowStock })
    },
  })
}

export function useAdjustStock() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, delta }: { id: string; delta: number }) =>
      productsService.adjustStock(id, delta),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEYS.all })
      void qc.invalidateQueries({ queryKey: KEYS.stats })
      void qc.invalidateQueries({ queryKey: KEYS.lowStock })
    },
  })
}

export function useDeleteProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => productsService.remove(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEYS.all })
      void qc.invalidateQueries({ queryKey: KEYS.stats })
      void qc.invalidateQueries({ queryKey: KEYS.lowStock })
    },
  })
}
