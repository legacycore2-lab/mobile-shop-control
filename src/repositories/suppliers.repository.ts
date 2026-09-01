import { supabase } from '@/lib/supabase'
import type { Supplier } from '@/types/database'

export const suppliersRepository = {

  getAll: async (): Promise<Supplier[]> => {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return data ?? []
  },

  getById: async (id: string): Promise<Supplier | null> => {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  },

  create: async (payload: Omit<Supplier, 'id' | 'created_at' | 'updated_at'>): Promise<Supplier> => {
    const { data, error } = await supabase
      .from('suppliers')
      .insert(payload)
      .select()
      .single()
    if (error) throw error
    return data
  },

  update: async (id: string, payload: Partial<Supplier>): Promise<Supplier> => {
    const { data, error } = await supabase
      .from('suppliers')
      .update(payload)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  remove: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('suppliers')
      .delete()
      .eq('id', id)
    if (error) throw error
  },
}
