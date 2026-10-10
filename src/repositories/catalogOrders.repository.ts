// src/repositories/catalogOrders.repository.ts
import { supabase } from '@/lib/supabase'
import type { CatalogOrder, CatalogOrderItem, CatalogOrderStatus } from '@/types/database'

export interface CatalogOrderWithItems extends CatalogOrder {
  items: CatalogOrderItem[]
}

const n = (v: unknown): number => Number(v ?? 0)

export const catalogOrdersRepository = {

  getAll: async (): Promise<CatalogOrderWithItems[]> => {
    const { data: orders, error } = await supabase
      .from('catalog_orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(300)
    if (error) throw error

    const rows = (orders ?? []) as CatalogOrder[]
    if (!rows.length) return []

    const { data: items, error: itemsErr } = await supabase
      .from('catalog_order_items')
      .select('*')
      .in('order_id', rows.map(o => o.id))
    if (itemsErr) throw itemsErr

    const byOrder = new Map<string, CatalogOrderItem[]>()
    for (const it of (items ?? []) as CatalogOrderItem[]) {
      const item = { ...it, unit_price: n(it.unit_price), quantity: n(it.quantity) }
      byOrder.set(it.order_id, [...(byOrder.get(it.order_id) ?? []), item])
    }

    return rows.map(o => ({ ...o, total: n(o.total), items: byOrder.get(o.id) ?? [] }))
  },

  countNew: async (): Promise<number> => {
    const { count, error } = await supabase
      .from('catalog_orders')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'new')
    if (error) throw error
    return count ?? 0
  },

  updateStatus: async (id: string, status: CatalogOrderStatus, userId: string): Promise<void> => {
    const { error } = await supabase
      .from('catalog_orders')
      .update({ status, handled_by: userId, updated_at: new Date().toISOString() } as never)
      .eq('id', id)
    if (error) throw error
  },
}
