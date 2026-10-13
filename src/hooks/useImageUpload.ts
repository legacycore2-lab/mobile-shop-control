// src/hooks/useImageUpload.ts
import { useMutation } from '@tanstack/react-query'
import { imagesService } from '@/services/images.service'

export function useImageUpload(folder: 'products' | 'models' | 'devices') {
  return useMutation({
    mutationFn: (file: File) => imagesService.upload(file, folder),
  })
}
