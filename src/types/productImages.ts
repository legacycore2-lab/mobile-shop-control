// src/types/productImages.ts

export interface ProductImageRow {
  id:       string
  name:     string
  category: string
  imageUrl: string | null
  stockQty: number
  unit:     string
}
