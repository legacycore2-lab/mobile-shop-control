import { supabase } from '@/lib/supabase'
import type { Supplier } from '@/types/database'

type SupplierInsert = Omit<Supplier, 'id' | 'created_at' | 'updated_at'>
type SupplierUpdate = Partial<Omit<Supplier, 'id' | 'created_at' | 'updated_at'>>

export const suppliersRepository = {

  getAll: async (): Promise<Supplier[]> => {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []) as Supplier[]
  },

  getById: async (id: string): Promise<Supplier | null> => {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw error
    return data as Supplier | null
  },

  create: async (payload: SupplierInsert): Promise<Supplier> => {
    const { data, error } = await supabase
      .from('suppliers')
      .insert(payload as never)
      .select()
      .single()
    if (error) throw error
    return data as Supplier
  },

  update: async (id: string, payload: SupplierUpdate): Promise<Supplier> => {
    const { data, error } = await supabase
      .from('suppliers')
      .update(payload as never)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as Supplier
  },

  remove: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('suppliers')
      .delete()
      .eq('id', id)
    if (error) throw error
  },
}
