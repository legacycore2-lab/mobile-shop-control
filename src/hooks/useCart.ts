// src/hooks/useCart.ts
import { useState } from 'react'
import { catalogService, type CartLine, type CatalogEntry } from '@/services/catalog.service'

export function useCart() {
  const [lines, setLines] = useState<CartLine[]>([])

  return {
    lines,
    total:  catalogService.cartTotal(lines),
    count:  catalogService.cartCount(lines),
    add:    (entry: CatalogEntry) => setLines(l => catalogService.addToCart(l, entry)),
    change: (key: string, delta: number) => setLines(l => catalogService.changeQuantity(l, key, delta)),
    remove: (key: string) => setLines(l => catalogService.removeLine(l, key)),
    clear:  () => setLines([]),
  }
}
