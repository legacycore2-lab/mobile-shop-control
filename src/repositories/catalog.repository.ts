// src/repositories/catalog.repository.ts
import { supabase } from '@/lib/supabase'
import type { PublicCatalog, CatalogOrderItemInput, CatalogOrderResult, TrackedOrder } from '@/types/database'

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
    const opt = (v: unknown): number | null => (v == null ? null : Number(v))
    return {
      store: {
        ...raw.store,
        installment_interest_percent: n(raw.store?.installment_interest_percent),
        installment_down_percent:     n(raw.store?.installment_down_percent),
      },
      products: raw.products.map(p => ({ ...p, selling_price: n(p.selling_price), old_price: opt(p.old_price), stock_qty: n(p.stock_qty) })),
      devices:  raw.devices.map(d => ({ ...d, selling_price: n(d.selling_price), old_price: opt(d.old_price), notes: d.notes ?? null })),
      reviews:  raw.reviews ?? [],
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
  trackOrder: async (number: string, phone: string): Promise<TrackedOrder | null> => {
    const { data, error } = await supabase.rpc('track_catalog_order', { p_number: number, p_phone: phone } as never)
    if (error) throw error
    if (!data) return null
    const t = data as TrackedOrder
    return { ...t, total: n(t.total) }
  },

  submitReview: async (number: string, phone: string, rating: number, comment: string | null): Promise<void> => {
    const { error } = await supabase.rpc('submit_catalog_review', {
      p_number: number, p_phone: phone, p_rating: rating, p_comment: comment,
    } as never)
    if (error) throw error
  },

  logEvent: async (type: 'visit' | 'view', item: string | null, session: string): Promise<void> => {
    await supabase.rpc('log_catalog_event', { p_type: type, p_item: item, p_session: session } as never)
  },
}
