import { supabase } from '@/lib/supabase'
import type { Customer } from '@/types/database'

type CustomerInsert = Omit<Customer, 'id' | 'created_at' | 'updated_at'>
type CustomerUpdate = Partial<Omit<Customer, 'id' | 'created_at' | 'updated_at'>>

export const customersRepository = {

  getAll: async (): Promise<Customer[]> => {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []) as Customer[]
  },

  getById: async (id: string): Promise<Customer | null> => {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw error
    return data as Customer | null
  },

  create: async (payload: CustomerInsert): Promise<Customer> => {
    const { data, error } = await supabase
      .from('customers')
      .insert(payload as never)
      .select()
      .single()
    if (error) throw error
    return data as Customer
  },

  update: async (id: string, payload: CustomerUpdate): Promise<Customer> => {
    const { data, error } = await supabase
      .from('customers')
      .update(payload as never)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as Customer
  },

  remove: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', id)
    if (error) throw error
  },
}
