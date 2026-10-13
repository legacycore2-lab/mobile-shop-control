// src/hooks/useModelImages.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { modelImagesService } from '@/services/modelImages.service'

const KEY = ['model_images'] as const

export function useModelImages() {
  return useQuery({ queryKey: KEY, queryFn: modelImagesService.getAll })
}

export function useSetModelImage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ modelId, slot, imageUrl }: { modelId: string; slot: 1 | 2; imageUrl: string | null }) =>
      modelImagesService.setImage(modelId, slot, imageUrl),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEY })
      void qc.invalidateQueries({ queryKey: ['mobile_models'] })
      void qc.invalidateQueries({ queryKey: ['catalog'] })
    },
  })
}
