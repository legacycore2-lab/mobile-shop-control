// src/repositories/expenses.repository.ts
import { supabase } from '@/lib/supabase'
import type { ExpenseCategory, ExpenseView } from '@/types/database'

function n(v: unknown): number { return Number(v ?? 0) }

export interface ExpenseInsert {
  category_id:      string | null
  amount:           number
  description:      string | null
  expense_date:     string
  payment_method:   string
  reference_number: string | null
  notes:            string | null
  created_by:       string | null
}

export interface ExpenseStats {
  total:       number
  thisMonth:   number
  lastMonth:   number
  byCategory:  { category_name: string; total: number; count: number }[]
}

export const expensesRepository = {

  // ── Categories ──────────────────────────────────────────────

  getCategories: async (): Promise<ExpenseCategory[]> => {
    const { data, error } = await supabase
      .from('expense_categories')
      .select('*')
      .order('name')
    if (error) throw error
    return (data ?? []) as ExpenseCategory[]
  },

  createCategory: async (name: string): Promise<ExpenseCategory> => {
    const { data, error } = await supabase
      .from('expense_categories')
      .insert({ name } as never)
      .select()
      .single()
    if (error) throw error
    return data as ExpenseCategory
  },

  // ── Expenses ────────────────────────────────────────────────

  getAll: async (): Promise<ExpenseView[]> => {
    const { data, error } = await supabase
      .from('expenses')
      .select(`
        *,
        expense_categories!category_id ( name ),
        profiles!created_by ( full_name )
      `)
      .order('expense_date', { ascending: false })
      .order('created_at',   { ascending: false })
      .limit(2000)
    if (error) throw error

    return ((data ?? []) as unknown[]).map(row => {
      const r   = row as Record<string, unknown>
      const cat = r['expense_categories'] as Record<string, unknown> | null
      const cby = r['profiles']           as Record<string, unknown> | null
      return {
        id:               String(r['id']),
        category_id:      r['category_id'] as string | null,
        amount:           n(r['amount']),
        description:      r['description']      as string | null,
        expense_date:     String(r['expense_date']),
        payment_method:   String(r['payment_method'] ?? 'cash'),
        reference_number: r['reference_number'] as string | null,
        notes:            r['notes']            as string | null,
        created_by:       r['created_by']       as string | null,
        created_at:       String(r['created_at']),
        updated_at:       String(r['updated_at']),
        category_name:    String(cat?.['name']        ?? 'غير محدد'),
        created_by_name:  String(cby?.['full_name']   ?? '—'),
      } as ExpenseView
    })
  },

  create: async (payload: ExpenseInsert): Promise<ExpenseView> => {
    const { data, error } = await supabase
      .from('expenses')
      .insert(payload as never)
      .select(`
        *,
        expense_categories!category_id ( name ),
        profiles!created_by ( full_name )
      `)
      .single()
    if (error) throw error
    const r   = data as unknown as Record<string, unknown>
    const cat = r['expense_categories'] as Record<string, unknown> | null
    const cby = r['profiles']           as Record<string, unknown> | null
    return {
      ...r,
      amount:          n(r['amount']),
      category_name:   String(cat?.['name']      ?? 'غير محدد'),
      created_by_name: String(cby?.['full_name'] ?? '—'),
    } as ExpenseView
  },

  update: async (id: string, payload: Partial<ExpenseInsert>): Promise<void> => {
    const { error } = await supabase
      .from('expenses')
      .update(payload as never)
      .eq('id', id)
    if (error) throw error
  },

  remove: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id)
    if (error) throw error
  },

  getStats: async (): Promise<ExpenseStats> => {
    const { data, error } = await supabase
      .from('expenses')
      .select(`
        amount,
        expense_date,
        expense_categories!category_id ( name )
      `)
    if (error) throw error

    const rows = ((data ?? []) as unknown[]).map(row => {
      const r   = row as Record<string, unknown>
      const cat = r['expense_categories'] as Record<string, unknown> | null
      return {
        amount:        n(r['amount']),
        expense_date:  String(r['expense_date']),
        category_name: String(cat?.['name'] ?? 'غير محدد'),
      }
    })

    const now       = new Date()
    const thisMonth = now.getFullYear() * 100 + (now.getMonth() + 1)
    const lastDate  = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonth = lastDate.getFullYear() * 100 + (lastDate.getMonth() + 1)

    const getYM = (d: string) => {
      const dt = new Date(d)
      return dt.getFullYear() * 100 + (dt.getMonth() + 1)
    }

    const total     = rows.reduce((s, r) => s + r.amount, 0)
    const thisMonthT = rows.filter(r => getYM(r.expense_date) === thisMonth).reduce((s, r) => s + r.amount, 0)
    const lastMonthT = rows.filter(r => getYM(r.expense_date) === lastMonth).reduce((s, r) => s + r.amount, 0)

    const catMap = new Map<string, { total: number; count: number }>()
    for (const r of rows) {
      const e = catMap.get(r.category_name) ?? { total: 0, count: 0 }
      catMap.set(r.category_name, { total: e.total + r.amount, count: e.count + 1 })
    }
    const byCategory = [...catMap.entries()]
      .map(([category_name, v]) => ({ category_name, ...v }))
      .sort((a, b) => b.total - a.total)

    return { total, thisMonth: thisMonthT, lastMonth: lastMonthT, byCategory }
  },
}
