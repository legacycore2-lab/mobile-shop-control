// src/types/modelImages.ts

export interface ModelImageRow {
  id:        string
  brand:     string
  name:      string
  imageUrl:  string | null
  imageUrl2: string | null
  inStock:   number
}
