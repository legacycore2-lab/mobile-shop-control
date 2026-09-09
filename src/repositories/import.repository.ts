// src/repositories/import.repository.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from '@/lib/supabase'
import type { ProductType } from '@/types/database'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ImportProductRow {
  name:          string
  category_name: string
  category_type: ProductType
  cost_price:    number
  selling_price: number
  stock_qty:     number
  reorder_level: number
  unit:          string
  sku:           string | null
  barcode:       string | null
  notes:         string | null
}

export interface ImportDeviceRow {
  imei1:           string
  imei2:           string | null
  brand_name:      string
  model_name:      string
  storage:         string | null
  color:           string | null
  condition:       string
  cost_price:      number
  selling_price:   number
  purchase_date:   string
  warranty_months: number
  serial_number:   string | null
  notes:           string | null
}

export interface ImportResult {
  success: number
  failed:  number
  errors:  { row: number; message: string }[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getOrCreateCategory(
  name: string,
  type: ProductType,
  cache: Map<string, string>,
): Promise<string> {
  const key = `${name}::${type}`
  if (cache.has(key)) return cache.get(key)!

  // try find
  const { data: existing } = await supabase
    .from('product_categories')
    .select('id')
    .eq('name', name)
    .eq('type', type)
    .maybeSingle()

  const ex = existing as unknown as { id: string } | null
  if (ex) {
    cache.set(key, ex.id)
    return ex.id
  }

  // create
  const { data: created, error } = await supabase
    .from('product_categories')
    .insert({ name, type } as never)
    .select('id')
    .single()
  if (error) throw new Error(`فشل إنشاء الفئة "${name}": ${error.message}`)

  cache.set(key, (created as { id: string }).id)
  return (created as { id: string }).id
}

async function getOrCreateBrand(
  name: string,
  cache: Map<string, string>,
): Promise<string> {
  if (cache.has(name)) return cache.get(name)!

  const { data: existing } = await supabase
    .from('mobile_brands')
    .select('id')
    .ilike('name', name)
    .maybeSingle()

  const exb = existing as unknown as { id: string } | null
  if (exb) {
    cache.set(name, exb.id)
    return exb.id
  }

  const { data: created, error } = await supabase
    .from('mobile_brands')
    .insert({ name } as never)
    .select('id')
    .single()
  if (error) throw new Error(`فشل إنشاء الماركة "${name}": ${error.message}`)

  cache.set(name, (created as { id: string }).id)
  return (created as { id: string }).id
}

async function getOrCreateModel(
  brandId: string,
  modelName: string,
  cache: Map<string, string>,
): Promise<string> {
  const key = `${brandId}::${modelName}`
  if (cache.has(key)) return cache.get(key)!

  const { data: existing } = await supabase
    .from('mobile_models')
    .select('id')
    .eq('brand_id', brandId)
    .ilike('name', modelName)
    .maybeSingle()

  const exm = existing as unknown as { id: string } | null
  if (exm) {
    cache.set(key, exm.id)
    return exm.id
  }

  const { data: created, error } = await supabase
    .from('mobile_models')
    .insert({ brand_id: brandId, name: modelName } as never)
    .select('id')
    .single()
  if (error) throw new Error(`فشل إنشاء الموديل "${modelName}": ${error.message}`)

  cache.set(key, (created as { id: string }).id)
  return (created as { id: string }).id
}

// ── Repository ────────────────────────────────────────────────────────────────

export const importRepository = {

  // ── Import Products ───────────────────────────────────────────────────────
  importProducts: async (
    rows:   ImportProductRow[],
    userId: string,
    onProgress?: (done: number, total: number) => void,
  ): Promise<ImportResult> => {
    const result: ImportResult = { success: 0, failed: 0, errors: [] }
    const catCache = new Map<string, string>()

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      try {
        const categoryId = await getOrCreateCategory(row.category_name, row.category_type, catCache)

        // check if product with same name+category exists → update stock
        const { data: existing } = await supabase
          .from('products')
          .select('id, stock_qty')
          .eq('name', row.name)
          .eq('category_id', categoryId)
          .eq('is_deleted', false)
          .maybeSingle()

        if (existing) {
          // update qty + prices
          const { error } = await supabase
            .from('products')
            .update({
              cost_price:    row.cost_price,
              selling_price: row.selling_price,
              stock_qty:     (existing as { id: string; stock_qty: number }).stock_qty + row.stock_qty,
              reorder_level: row.reorder_level,
              unit:          row.unit,
              ...(row.sku     ? { sku:     row.sku }     : {}),
              ...(row.barcode ? { barcode: row.barcode } : {}),
              ...(row.notes   ? { notes:   row.notes }   : {}),
            } as never)
            .eq('id', (existing as { id: string }).id)
          if (error) throw new Error(error.message)
        } else {
          const { error } = await supabase
            .from('products')
            .insert({
              name:               row.name,
              category_id:        categoryId,
              product_type:       row.category_type,
              cost_price:         row.cost_price,
              selling_price:      row.selling_price,
              stock_qty:          row.stock_qty,
              reorder_level:      row.reorder_level,
              unit:               row.unit,
              sku:                row.sku    ?? null,
              barcode:            row.barcode ?? null,
              notes:              row.notes   ?? null,
              is_active:          true,
              is_deleted:         false,
              compatible_models:  null,
              default_supplier_id: null,
              created_by:         userId,
            } as never)
          if (error) throw new Error(error.message)
        }

        result.success++
      } catch (err) {
        result.failed++
        result.errors.push({ row: i + 5, message: err instanceof Error ? err.message : String(err) })
      }

      onProgress?.(i + 1, rows.length)
    }

    return result
  },

  // ── Import Devices ────────────────────────────────────────────────────────
  importDevices: async (
    rows:   ImportDeviceRow[],
    userId: string,
    onProgress?: (done: number, total: number) => void,
  ): Promise<ImportResult> => {
    const result: ImportResult = { success: 0, failed: 0, errors: [] }
    const brandCache = new Map<string, string>()
    const modelCache = new Map<string, string>()

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      try {
        // check IMEI not already in DB
        const { data: dup } = await supabase
          .from('mobile_devices')
          .select('id')
          .eq('imei1', row.imei1)
          .maybeSingle()
        if (dup) throw new Error(`IMEI مكرر في قاعدة البيانات: ${row.imei1}`)

        const brandId = await getOrCreateBrand(row.brand_name, brandCache)
        const modelId = await getOrCreateModel(brandId, row.model_name, modelCache)

        const { error } = await supabase
          .from('mobile_devices')
          .insert({
            imei1:              row.imei1,
            imei2:              row.imei2       ?? null,
            serial_number:      row.serial_number ?? null,
            model_id:           modelId,
            storage:            row.storage      ?? null,
            color:              row.color        ?? null,
            condition:          row.condition,
            cost_price:         row.cost_price,
            selling_price:      row.selling_price || row.cost_price,
            actual_selling_price: null,
            purchase_date:      row.purchase_date,
            warranty_months:    row.warranty_months,
            warranty_expires_at: null,
            status:             'in_stock',
            supplier_id:        userId,   // placeholder — no supplier in template
            purchase_invoice_id: null,
            sold_to_customer_id: null,
            sale_invoice_id:    null,
            sold_at:            null,
            location:           null,
            notes:              row.notes ?? null,
            added_by:           userId,
            sold_by:            null,
          } as never)
        if (error) throw new Error(error.message)

        result.success++
      } catch (err) {
        result.failed++
        result.errors.push({ row: i + 5, message: err instanceof Error ? err.message : String(err) })
      }

      onProgress?.(i + 1, rows.length)
    }

    return result
  },
}
