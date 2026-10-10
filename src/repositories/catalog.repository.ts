// src/repositories/catalog.repository.ts
import { supabase } from '@/lib/supabase'
import type { PublicCatalog, CatalogOrderItemInput, CatalogOrderResult } from '@/types/database'

export interface CreateCatalogOrderPayload {
  name:  string
  phone: string
  notes: string | null
  items: CatalogOrderItemInput[]
}

const n = (v: unknown): number => Number(v ?? 0)

export const catalogRepository = {

  getPublic: async (): Promise<PublicCatalog> => {
    const { data, error } = await supabase.rpc('get_public_catalog')
    if (error) throw error
    const raw = data as PublicCatalog
    return {
      products: raw.products.map(p => ({ ...p, selling_price: n(p.selling_price), stock_qty: n(p.stock_qty) })),
      devices:  raw.devices.map(d => ({ ...d, selling_price: n(d.selling_price) })),
    }
  },

  createOrder: async (payload: CreateCatalogOrderPayload): Promise<CatalogOrderResult> => {
    const { data, error } = await supabase.rpc('create_catalog_order', {
      p_name:  payload.name,
      p_phone: payload.phone,
      p_notes: payload.notes,
      p_items: payload.items,
    } as never)
    if (error) throw error
    return data as CatalogOrderResult
  },
}
