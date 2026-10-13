// src/hooks/useProductImages.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { productImagesService } from '@/services/productImages.service'

const KEY = ['product_images'] as const

export function useProductImages() {
  return useQuery({ queryKey: KEY, queryFn: productImagesService.getAll })
}

export function useSetProductImage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ productId, imageUrl }: { productId: string; imageUrl: string | null }) =>
      productImagesService.setImage(productId, imageUrl),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEY })
      void qc.invalidateQueries({ queryKey: ['products'] })
      void qc.invalidateQueries({ queryKey: ['catalog'] })
    },
  })
}
