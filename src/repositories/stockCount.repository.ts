// src/repositories/stockCount.repository.ts
import { supabase } from '@/lib/supabase'
import type {
  PublicStockCount, StockCountAnswer, StockCountItem, StockCountItemRow, StockCountSessionRow,
} from '@/types/stockCount'

const n = (v: unknown): number => Number(v ?? 0)

const SESSIONS_PER_REQUEST = 10

const optNum = (v: unknown): number | null => (v == null ? null : Number(v))

function normalizeItem<T extends StockCountItem>(it: T): T {
  return { ...it, system_qty: n(it.system_qty), counted_qty: optNum(it.counted_qty) }
}

export const stockCountRepository = {

  getSessions: async (): Promise<StockCountSessionRow[]> => {
    const { data, error } = await supabase
      .from('stock_count_sessions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(60)
    if (error) throw error
    return (data ?? []) as StockCountSessionRow[]
  },

  getItems: async (sessionIds: string[]): Promise<StockCountItemRow[]> => {
    if (!sessionIds.length) return []
    // الجرد الشامل ممكن يبقى فيه عشرات الأصناف، فبنجيب كل 10 جلسات في طلب لتجنب حد الصفوف
    const chunks: string[][] = []
    for (let i = 0; i < sessionIds.length; i += SESSIONS_PER_REQUEST) {
      chunks.push(sessionIds.slice(i, i + SESSIONS_PER_REQUEST))
    }
    const results = await Promise.all(chunks.map(async ids => {
      const { data, error } = await supabase
        .from('stock_count_items')
        .select('*')
        .in('session_id', ids)
        .limit(1000)
      if (error) throw error
      return (data ?? []) as StockCountItemRow[]
    }))
    return results.flat().map(normalizeItem)
  },

  create: async (employeeId: string, productsCount: number | null, modelsCount: number | null): Promise<string> => {
    const { data, error } = await supabase.rpc('create_stock_count', {
      p_employee_id: employeeId,
      p_products:    productsCount,
      p_models:      modelsCount,
    } as never)
    if (error) throw error
    return data as string
  },

  getByToken: async (token: string): Promise<PublicStockCount | null> => {
    const { data, error } = await supabase.rpc('get_stock_count_by_token', { p_token: token } as never)
    if (error) throw error
    if (!data) return null
    const session = data as PublicStockCount
    return { ...session, items: session.items.map(normalizeItem) }
  },

  submit: async (token: string, answers: StockCountAnswer[]): Promise<void> => {
    const { error } = await supabase.rpc('submit_stock_count', {
      p_token:   token,
      p_answers: answers,
    } as never)
    if (error) throw error
  },
}
