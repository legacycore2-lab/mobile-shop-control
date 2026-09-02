// src/repositories/products.repository.ts
import { supabase } from '@/lib/supabase'
import type { Product, ProductCategory, ProductType } from '@/types/database'

type ProductInsert = Omit<Product, 'id' | 'created_at' | 'updated_at'>
type ProductUpdate = Partial<Omit<Product, 'id' | 'created_at' | 'updated_at'>>

export interface ProductWithCategory extends Product {
  category_name: string
  category_type: ProductType
  supplier_name: string | null
}

export interface LowStockProduct {
  product_id: string
  product_name: string
  stock_qty: number
  reorder_level: number
  category_name: string
}

export const productsRepository = {

  // ── Categories ────────────────────────────────────────────────────────────

  getAllCategories: async (): Promise<ProductCategory[]> => {
    const { data, error } = await supabase
      .from('product_categories')
      .select('*')
      .order('name')
    if (error) throw error
    return (data ?? []) as ProductCategory[]
  },

  createCategory: async (payload: Omit<ProductCategory, 'id' | 'created_at'>): Promise<ProductCategory> => {
    const { data, error } = await supabase
      .from('product_categories')
      .insert(payload as never)
      .select()
      .single()
    if (error) throw error
    return data as ProductCategory
  },

  updateCategory: async (id: string, payload: Partial<Omit<ProductCategory, 'id' | 'created_at'>>): Promise<ProductCategory> => {
    const { data, error } = await supabase
      .from('product_categories')
      .update(payload as never)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as ProductCategory
  },

  removeCategory: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('product_categories')
      .delete()
      .eq('id', id)
    if (error) throw error
  },

  // ── Products ──────────────────────────────────────────────────────────────

  getAll: async (): Promise<ProductWithCategory[]> => {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        product_categories!category_id ( name, type ),
        suppliers!default_supplier_id ( name )
      `)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
    if (error) throw error

    return ((data ?? []) as unknown[]).map(row => {
      const r   = row as Record<string, unknown>
      const cat = r['product_categories'] as Record<string, unknown> | null
      const sup = r['suppliers']          as Record<string, unknown> | null
      return {
        ...r,
        category_name: (cat?.['name'] as string) ?? '—',
        category_type: (cat?.['type'] as ProductType) ?? 'accessory',
        supplier_name: (sup?.['name'] as string | null) ?? null,
      } as ProductWithCategory
    })
  },

  getById: async (id: string): Promise<ProductWithCategory | null> => {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        product_categories!category_id ( name, type ),
        suppliers!default_supplier_id ( name )
      `)
      .eq('id', id)
      .eq('is_deleted', false)
      .single()
    if (error) throw error
    if (!data) return null
    const r   = data as unknown as Record<string, unknown>
    const cat = r['product_categories'] as Record<string, unknown> | null
    const sup = r['suppliers']          as Record<string, unknown> | null
    return {
      ...r,
      category_name: (cat?.['name'] as string) ?? '—',
      category_type: (cat?.['type'] as ProductType) ?? 'accessory',
      supplier_name: (sup?.['name'] as string | null) ?? null,
    } as ProductWithCategory
  },

  getLowStock: async (): Promise<LowStockProduct[]> => {
    const { data, error } = await supabase.rpc('get_low_stock_products')
    if (error) throw error
    return (data ?? []) as LowStockProduct[]
  },

  create: async (payload: ProductInsert): Promise<Product> => {
    const { data, error } = await supabase
      .from('products')
      .insert(payload as never)
      .select()
      .single()
    if (error) throw error
    return data as Product
  },

  update: async (id: string, payload: ProductUpdate): Promise<Product> => {
    const { data, error } = await supabase
      .from('products')
      .update(payload as never)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as Product
  },

  adjustStock: async (id: string, delta: number): Promise<Product> => {
    const { data: current, error: fetchErr } = await supabase
      .from('products')
      .select('stock_qty')
      .eq('id', id)
      .single()
    if (fetchErr) throw fetchErr
    const newQty = Math.max(0, ((current as { stock_qty: number }).stock_qty ?? 0) + delta)
    const { data, error } = await supabase
      .from('products')
      .update({ stock_qty: newQty } as never)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as Product
  },

  // ── Soft Delete — يضع is_deleted = true بدل الحذف الفعلي ──────────────
  softDelete: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('products')
      .update({ is_deleted: true } as never)
      .eq('id', id)
    if (error) throw error
  },

  // ── Hard Delete — للطوارئ فقط ────────────────────────────────────────────
  remove: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id)
    if (error) throw error
  },
}
