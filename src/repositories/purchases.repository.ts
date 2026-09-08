// src/repositories/purchases.repository.ts
// ── SQL queries ONLY — no business logic ─────────────────────────────────────
import { supabase } from '@/lib/supabase'
import type {
  PurchaseInvoice, PurchaseInvoiceView,
  PurchaseInvoiceDevice, PurchaseInvoiceProduct,
} from '@/types/database'

// ── Line insert shapes ────────────────────────────────────────────────────────

export interface InvoiceDeviceLine {
  device_id:  string
  cost_price: number
}

export interface InvoiceProductLine {
  product_id: string
  quantity:   number
  unit_price: number
}

// ── Detail shape ──────────────────────────────────────────────────────────────

export interface InvoiceDetailDevice extends PurchaseInvoiceDevice {
  brand_name:      string
  model_name:      string
  imei1:           string
  imei2:           string | null
  storage:         string | null
  color:           string | null
  condition:       string
  selling_price:   number
  warranty_months: number
}

export interface InvoiceDetailProduct extends PurchaseInvoiceProduct {
  product_name:  string
  unit:          string
  sku:           string | null
  barcode:       string | null
  selling_price: number
  category_name: string
}

export interface InvoiceDetail {
  invoice:  PurchaseInvoiceView
  devices:  InvoiceDetailDevice[]
  products: InvoiceDetailProduct[]
}

// ── Helper ────────────────────────────────────────────────────────────────────

const INVOICE_SELECT = `
  id, invoice_number, supplier_id, invoice_date,
  total_amount, paid_amount, discount, remaining,
  notes, status, created_by, created_at, updated_at,
  suppliers!supplier_id ( name ),
  profiles!created_by ( full_name ),
  devices_agg:purchase_invoice_devices ( id ),
  products_agg:purchase_invoice_products ( id )
`

function toView(r: Record<string, unknown>): PurchaseInvoiceView {
  const sup = r['suppliers']     as Record<string, unknown> | null
  const cby = r['profiles']      as Record<string, unknown> | null
  const dev = r['devices_agg']   as unknown[] | null
  const prd = r['products_agg']  as unknown[] | null
  const total    = Number(r['total_amount'] ?? 0)
  const paid     = Number(r['paid_amount']  ?? 0)
  const discount = Number(r['discount']     ?? 0)
  return {
    ...r,
    total_amount:    total,
    paid_amount:     paid,
    discount:        discount,
    remaining:       total - paid - discount,
    supplier_name:   String(sup?.['name']      ?? '—'),
    created_by_name: String(cby?.['full_name'] ?? '—'),
    devices_count:   (dev  ?? []).length,
    products_count:  (prd  ?? []).length,
  } as PurchaseInvoiceView
}

// ── Repository ────────────────────────────────────────────────────────────────

export const purchasesRepository = {

  nextInvoiceNumber: async (): Promise<string> => {
    const { data, error } = await supabase.rpc('next_purchase_invoice_number')
    if (error) throw error
    return data as string
  },

  getAll: async (): Promise<PurchaseInvoiceView[]> => {
    const { data, error } = await supabase.rpc('get_purchase_invoices')
    if (error) throw error
    return ((data ?? []) as unknown[]).map(row => {
      const r = row as Record<string, unknown>
      return {
        ...(r as unknown as PurchaseInvoiceView),
        total_amount:    Number(r['total_amount']   ?? 0),
        paid_amount:     Number(r['paid_amount']    ?? 0),
        discount:        Number(r['discount']       ?? 0),
        remaining:       Number(r['remaining']      ?? 0),
        devices_count:   Number(r['devices_count']  ?? 0),
        products_count:  Number(r['products_count'] ?? 0),
        supplier_name:   String(r['supplier_name']   ?? '—'),
        created_by_name: String(r['created_by_name'] ?? '—'),
      } as PurchaseInvoiceView
    })
  },

  getById: async (id: string): Promise<InvoiceDetail | null> => {
    const { data: inv, error: invErr } = await supabase
      .from('purchase_invoices')
      .select(INVOICE_SELECT)
      .eq('id', id)
      .single()
    if (invErr) throw invErr
    if (!inv) return null

    const invoice = toView(inv as unknown as Record<string, unknown>)

    const { data: devRows, error: devErr } = await supabase
      .from('purchase_invoice_devices')
      .select(`
        *,
        mobile_devices!device_id (
          imei1, imei2, storage, color, condition,
          selling_price, warranty_months,
          mobile_models!model_id ( name, mobile_brands!brand_id ( name ) )
        )
      `)
      .eq('invoice_id', id)
    if (devErr) throw devErr

    const devices: InvoiceDetailDevice[] = ((devRows ?? []) as unknown[]).map(row => {
      const d     = row as Record<string, unknown>
      const dev   = d['mobile_devices']    as Record<string, unknown> | null
      const model = dev?.['mobile_models'] as Record<string, unknown> | null
      const brand = model?.['mobile_brands'] as Record<string, unknown> | null
      return {
        id:              String(d['id']),
        invoice_id:      String(d['invoice_id']),
        device_id:       String(d['device_id']),
        cost_price:      Number(d['cost_price']),
        created_at:      String(d['created_at']),
        brand_name:      String(brand?.['name']       ?? '—'),
        model_name:      String(model?.['name']       ?? '—'),
        imei1:           String(dev?.['imei1']         ?? '—'),
        imei2:           dev?.['imei2'] ? String(dev['imei2']) : null,
        storage:         dev?.['storage'] ? String(dev['storage']) : null,
        color:           dev?.['color']   ? String(dev['color'])   : null,
        condition:       String(dev?.['condition']     ?? 'new'),
        selling_price:   Number(dev?.['selling_price'] ?? 0),
        warranty_months: Number(dev?.['warranty_months'] ?? 0),
      }
    })

    const { data: prdRows, error: prdErr } = await supabase
      .from('purchase_invoice_products')
      .select(`
        *,
        products!product_id (
          name, unit, sku, barcode, selling_price,
          product_categories!category_id ( name )
        )
      `)
      .eq('invoice_id', id)
    if (prdErr) throw prdErr

    const products: InvoiceDetailProduct[] = ((prdRows ?? []) as unknown[]).map(row => {
      const p   = row as Record<string, unknown>
      const prd = p['products'] as Record<string, unknown> | null
      const cat = prd?.['product_categories'] as Record<string, unknown> | null
      return {
        id:            String(p['id']),
        invoice_id:    String(p['invoice_id']),
        product_id:    String(p['product_id']),
        quantity:      Number(p['quantity']),
        unit_price:    Number(p['unit_price']),
        subtotal:      Number(p['subtotal']),
        created_at:    String(p['created_at']),
        product_name:  String(prd?.['name']     ?? '—'),
        unit:          String(prd?.['unit']      ?? 'قطعة'),
        sku:           prd?.['sku']     ? String(prd['sku'])     : null,
        barcode:       prd?.['barcode'] ? String(prd['barcode']) : null,
        selling_price: Number(prd?.['selling_price'] ?? 0),
        category_name: String(cat?.['name'] ?? '—'),
      }
    })

    return { invoice, devices, products }
  },

  create: async (payload: Omit<PurchaseInvoice, 'id' | 'created_at' | 'updated_at' | 'remaining'>): Promise<PurchaseInvoice> => {
    const { data, error } = await supabase
      .from('purchase_invoices')
      .insert(payload as never)
      .select()
      .single()
    if (error) throw error
    return data as PurchaseInvoice
  },

  addDeviceLines: async (invoiceId: string, lines: InvoiceDeviceLine[]): Promise<void> => {
    if (!lines.length) return
    const { error } = await supabase
      .from('purchase_invoice_devices')
      .insert(lines.map(l => ({ invoice_id: invoiceId, ...l })) as never)
    if (error) throw error
  },

  addProductLines: async (invoiceId: string, lines: InvoiceProductLine[]): Promise<void> => {
    if (!lines.length) return
    const { error } = await supabase
      .from('purchase_invoice_products')
      .insert(lines.map(l => ({ invoice_id: invoiceId, ...l })) as never)
    if (error) throw error
  },

  update: async (id: string, payload: Partial<Omit<PurchaseInvoice, 'id' | 'created_at' | 'updated_at'>>): Promise<PurchaseInvoice> => {
    const { data, error } = await supabase
      .from('purchase_invoices')
      .update(payload as never)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as PurchaseInvoice
  },

  updateStatus: async (id: string, status: PurchaseInvoice['status']): Promise<void> => {
    const { error } = await supabase
      .from('purchase_invoices')
      .update({ status } as never)
      .eq('id', id)
    if (error) throw error
  },

  // ── Bulk helpers (called from service) ───────────────────────────────────

  getDeviceLinesByInvoice: async (invoiceId: string) => {
    const { data, error } = await supabase
      .from('purchase_invoice_devices')
      .select('device_id')
      .eq('invoice_id', invoiceId)
    if (error) throw error
    return (data ?? []) as { device_id: string }[]
  },

  getProductLinesByInvoice: async (invoiceId: string) => {
    const { data, error } = await supabase
      .from('purchase_invoice_products')
      .select('product_id, quantity')
      .eq('invoice_id', invoiceId)
    if (error) throw error
    return (data ?? []) as { product_id: string; quantity: number }[]
  },

  // Bulk link devices to invoice (single .in() update)
  linkDevicesToInvoice: async (deviceIds: string[], invoiceId: string): Promise<void> => {
    if (!deviceIds.length) return
    const { error } = await supabase
      .from('mobile_devices')
      .update({ purchase_invoice_id: invoiceId } as never)
      .in('id', deviceIds)
    if (error) throw error
  },

  // Bulk adjust product stock (parallel, not serial)
  adjustProductStock: async (lines: { product_id: string; qty_delta: number }[]): Promise<void> => {
    if (!lines.length) return
    await Promise.all(lines.map(async ({ product_id, qty_delta }) => {
      const { data: prod } = await supabase
        .from('products')
        .select('stock_qty')
        .eq('id', product_id)
        .single()
      if (!prod) return
      const current = Number((prod as Record<string, unknown>)['stock_qty'] ?? 0)
      await supabase
        .from('products')
        .update({ stock_qty: Math.max(0, current + qty_delta) } as never)
        .eq('id', product_id)
    }))
  },

  remove: async (id: string): Promise<void> => {
    const { error } = await supabase.from('purchase_invoices').delete().eq('id', id)
    if (error) throw error
  },

  getUnlinkedDevicesBySupplier: async (supplierId: string) => {
    const { data, error } = await supabase
      .from('mobile_devices')
      .select(`
        id, imei1, cost_price,
        mobile_models!model_id ( name, mobile_brands!brand_id ( name ) )
      `)
      .eq('supplier_id', supplierId)
      .is('purchase_invoice_id', null)
    if (error) throw error
    return ((data ?? []) as unknown[]).map(row => {
      const r     = row as Record<string, unknown>
      const model = r['mobile_models']     as Record<string, unknown> | null
      const brand = model?.['mobile_brands'] as Record<string, unknown> | null
      return {
        id:         String(r['id']),
        imei1:      String(r['imei1']),
        cost_price: Number(r['cost_price']),
        brand_name: String(brand?.['name'] ?? '—'),
        model_name: String(model?.['name'] ?? '—'),
      }
    })
  },

  getStats: async () => {
    const { data, error } = await supabase
      .from('purchase_invoices')
      .select('status, total_amount, paid_amount, discount')
    if (error) throw error
    const rows      = (data ?? []) as { status: string; total_amount: number; paid_amount: number; discount: number }[]
    const confirmed = rows.filter(r => r.status === 'confirmed')
    return {
      total:      rows.length,
      draft:      rows.filter(r => r.status === 'draft').length,
      confirmed:  confirmed.length,
      cancelled:  rows.filter(r => r.status === 'cancelled').length,
      totalSpent: confirmed.reduce((s, r) => s + (r.total_amount ?? 0), 0),
      totalPaid:  confirmed.reduce((s, r) => s + (r.paid_amount  ?? 0), 0),
      totalDue:   confirmed.reduce((s, r) => s + Math.max(0, (r.total_amount ?? 0) - (r.paid_amount ?? 0) - (r.discount ?? 0)), 0),
    }
  },
}
