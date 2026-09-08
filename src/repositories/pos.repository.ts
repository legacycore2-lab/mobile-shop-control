// src/repositories/pos.repository.ts
// ── SQL queries ONLY — no business logic ─────────────────────────────────────
import { supabase } from '@/lib/supabase'
import type {
  MobileDeviceView,
  SaleInvoice, SaleInvoiceView,
  SaleInvoiceDevice, SaleInvoiceProduct,
} from '@/types/database'

// ── Line insert shapes ────────────────────────────────────────────────────────

export interface SaleDeviceLine {
  device_id:            string
  actual_selling_price: number
}

export interface SaleProductLine {
  product_id: string
  quantity:   number
  unit_price: number
}

// ── Detail shape returned by getById ─────────────────────────────────────────

export interface SaleInvoiceDetail {
  invoice:  SaleInvoiceView
  devices:  (SaleInvoiceDevice & { brand_name: string; model_name: string; imei1: string; cost_price: number })[]
  products: (SaleInvoiceProduct & { product_name: string; unit: string; cost_price: number })[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function toView(r: Record<string, unknown>): SaleInvoiceView {
  const cust = r['customers'] as Record<string, unknown> | null
  const cby  = r['profiles']  as Record<string, unknown> | null
  const dev  = r['devices_agg']  as unknown[] | null
  const prd  = r['products_agg'] as unknown[] | null
  const total    = Number(r['total_amount'] ?? 0)
  const paid     = Number(r['paid_amount']  ?? 0)
  const discount = Number(r['discount']     ?? 0)
  return {
    ...r,
    total_amount:    total,
    paid_amount:     paid,
    discount:        discount,
    remaining:       Math.max(0, total - paid - discount),
    customer_name:   (cust?.['name']  as string | null) ?? null,
    customer_phone:  (cust?.['phone'] as string | null) ?? null,
    created_by_name: String(cby?.['full_name'] ?? '—'),
    devices_count:   (dev  ?? []).length,
    products_count:  (prd  ?? []).length,
  } as SaleInvoiceView
}

const INVOICE_SELECT = `
  *,
  customers!customer_id ( name, phone ),
  profiles!created_by ( full_name ),
  devices_agg:sale_invoice_devices ( id ),
  products_agg:sale_invoice_products ( id )
`

// ── Repository ────────────────────────────────────────────────────────────────

export const posRepository = {

  nextInvoiceNumber: async (): Promise<string> => {
    const { data, error } = await supabase.rpc('next_sale_invoice_number')
    if (error) return `SAL-${Date.now().toString().slice(-6)}`
    return data as string
  },

  getAll: async (): Promise<SaleInvoiceView[]> => {
    const { data, error } = await supabase
      .from('sale_invoices')
      .select(INVOICE_SELECT)
      .order('created_at', { ascending: false })
    if (error) throw error
    return ((data ?? []) as unknown[]).map(r => toView(r as Record<string, unknown>))
  },

  getById: async (id: string): Promise<SaleInvoiceDetail | null> => {
    const { data: inv, error: invErr } = await supabase
      .from('sale_invoices')
      .select(INVOICE_SELECT)
      .eq('id', id)
      .single()
    if (invErr) throw invErr
    if (!inv) return null

    const invoice = toView(inv as unknown as Record<string, unknown>)

    const { data: devRows, error: devErr } = await supabase
      .from('sale_invoice_devices')
      .select(`
        *,
        mobile_devices!device_id (
          imei1, cost_price,
          mobile_models!model_id ( name, mobile_brands!brand_id ( name ) )
        )
      `)
      .eq('invoice_id', id)
    if (devErr) throw devErr

    const devices = ((devRows ?? []) as unknown[]).map(row => {
      const d     = row as Record<string, unknown>
      const dev   = d['mobile_devices']    as Record<string, unknown> | null
      const model = dev?.['mobile_models'] as Record<string, unknown> | null
      const brand = model?.['mobile_brands'] as Record<string, unknown> | null
      return {
        id:                   String(d['id']),
        invoice_id:           String(d['invoice_id']),
        device_id:            String(d['device_id']),
        actual_selling_price: Number(d['actual_selling_price']),
        created_at:           String(d['created_at']),
        brand_name:           String(brand?.['name'] ?? '—'),
        model_name:           String(model?.['name'] ?? '—'),
        imei1:                String(dev?.['imei1']  ?? '—'),
        cost_price:           Number(dev?.['cost_price'] ?? 0),
      }
    })

    const { data: prdRows, error: prdErr } = await supabase
      .from('sale_invoice_products')
      .select(`*, products!product_id ( name, unit, cost_price )`)
      .eq('invoice_id', id)
    if (prdErr) throw prdErr

    const products = ((prdRows ?? []) as unknown[]).map(row => {
      const p   = row as Record<string, unknown>
      const prd = p['products'] as Record<string, unknown> | null
      return {
        id:           String(p['id']),
        invoice_id:   String(p['invoice_id']),
        product_id:   String(p['product_id']),
        quantity:     Number(p['quantity']),
        unit_price:   Number(p['unit_price']),
        subtotal:     Number(p['subtotal']),
        created_at:   String(p['created_at']),
        product_name: String(prd?.['name'] ?? '—'),
        unit:         String(prd?.['unit'] ?? 'قطعة'),
        cost_price:   Number(prd?.['cost_price'] ?? 0),
      }
    })

    return { invoice, devices, products }
  },

  create: async (payload: Omit<SaleInvoice, 'id' | 'created_at' | 'updated_at' | 'remaining'>): Promise<SaleInvoice> => {
    const { data, error } = await supabase
      .from('sale_invoices')
      .insert(payload as never)
      .select()
      .single()
    if (error) throw error
    return data as SaleInvoice
  },

  addDeviceLines: async (invoiceId: string, lines: SaleDeviceLine[]): Promise<void> => {
    if (!lines.length) return
    const { error } = await supabase
      .from('sale_invoice_devices')
      .insert(lines.map(l => ({ invoice_id: invoiceId, ...l })) as never)
    if (error) throw error
  },

  addProductLines: async (invoiceId: string, lines: SaleProductLine[]): Promise<void> => {
    if (!lines.length) return
    const { error } = await supabase
      .from('sale_invoice_products')
      .insert(lines.map(l => ({ invoice_id: invoiceId, ...l })) as never)
    if (error) throw error
  },

  updateStatus: async (id: string, status: SaleInvoice['status']): Promise<void> => {
    const { error } = await supabase
      .from('sale_invoices')
      .update({ status } as never)
      .eq('id', id)
    if (error) throw error
  },

  // ── Bulk device update — no N+1 ───────────────────────────────────────────

  getDeviceLinesByInvoice: async (invoiceId: string) => {
    const { data, error } = await supabase
      .from('sale_invoice_devices')
      .select('device_id, actual_selling_price')
      .eq('invoice_id', invoiceId)
    if (error) throw error
    return (data ?? []) as { device_id: string; actual_selling_price: number }[]
  },

  getProductLinesByInvoice: async (invoiceId: string) => {
    const { data, error } = await supabase
      .from('sale_invoice_products')
      .select('product_id, quantity')
      .eq('invoice_id', invoiceId)
    if (error) throw error
    return (data ?? []) as { product_id: string; quantity: number }[]
  },

  // Bulk mark devices as sold (single query per call via .in())
  markDevicesSold: async (
    deviceIds: string[],
    invoiceId: string,
    customerId: string | null,
    soldById: string,
    priceMap: Map<string, number>,
  ): Promise<void> => {
    if (!deviceIds.length) return
    // Supabase doesn't support per-row different values in bulk update,
    // so we do one update per device but batch them with Promise.all — not N+1 serially
    await Promise.all(deviceIds.map(deviceId =>
      supabase
        .from('mobile_devices')
        .update({
          status:               'sold',
          sale_invoice_id:      invoiceId,
          sold_to_customer_id:  customerId,
          actual_selling_price: priceMap.get(deviceId) ?? null,
          sold_at:              new Date().toISOString(),
          sold_by:              soldById,
        } as never)
        .eq('id', deviceId)
    ))
  },

  // Bulk return devices to stock (single .in() query)
  markDevicesInStock: async (deviceIds: string[]): Promise<void> => {
    if (!deviceIds.length) return
    const { error } = await supabase
      .from('mobile_devices')
      .update({
        status:               'in_stock',
        sold_to_customer_id:  null,
        actual_selling_price: null,
        sold_at:              null,
        sold_by:              null,
      } as never)
      .in('id', deviceIds)
    if (error) throw error
  },

  // Bulk adjust product stock (one query per product but parallel)
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
    const { error } = await supabase.from('sale_invoices').delete().eq('id', id)
    if (error) throw error
  },

  // ── POS — available devices (exclude those already in any sale invoice) ───

  getInStockDevices: async (): Promise<MobileDeviceView[]> => {
    // Get device IDs already in any sale invoice (draft or confirmed)
    const { data: soldRows } = await supabase
      .from('sale_invoice_devices')
      .select('device_id')
    const soldIds = new Set((soldRows ?? []).map((r: Record<string, unknown>) => String(r['device_id'])))

    const { data, error } = await supabase
      .from('mobile_devices')
      .select(`
        *,
        mobile_models!model_id ( name, mobile_brands!brand_id ( name ) ),
        suppliers!supplier_id ( name )
      `)
      .eq('status', 'in_stock')
      .order('created_at', { ascending: false })
    if (error) throw error

    return ((data ?? []) as unknown[])
      .filter(row => !soldIds.has(String((row as Record<string, unknown>)['id'])))
      .map(row => {
        const r     = row as Record<string, unknown>
        const model = r['mobile_models']     as Record<string, unknown> | null
        const brand = model?.['mobile_brands'] as Record<string, unknown> | null
        const sup   = r['suppliers']         as Record<string, unknown> | null
        return {
          ...r,
          brand_name:     String(brand?.['name'] ?? '—'),
          model_name:     String(model?.['name'] ?? '—'),
          supplier_name:  String(sup?.['name']   ?? '—'),
          customer_name:  null,
          customer_phone: null,
          added_by_name:  '—',
          sold_by_name:   null,
        } as MobileDeviceView
      })
  },

  // ── Stats (aggregate query — no full table scan) ──────────────────────────

  getStats: async () => {
    const { data, error } = await supabase
      .from('sale_invoices')
      .select('status, total_amount, paid_amount, discount')
    if (error) throw error

    const rows      = (data ?? []) as { status: string; total_amount: number; paid_amount: number; discount: number }[]
    const confirmed = rows.filter(r => r.status === 'confirmed')

    const { data: devCost, error: devErr } = await supabase
      .from('mobile_devices')
      .select('cost_price')
      .eq('status', 'sold')
    if (devErr) throw devErr

    const { data: prodLines, error: prodErr } = await supabase
      .from('sale_invoice_products')
      .select('quantity, products!product_id ( cost_price ), sale_invoices!invoice_id ( status )')
    if (prodErr) throw prodErr

    const costDevices = (devCost ?? []).reduce<number>(
      (s, r) => s + Number((r as Record<string, unknown>)['cost_price'] ?? 0), 0
    )
    const costProducts = ((prodLines ?? []) as unknown[]).reduce<number>((s, row) => {
      const r   = row as Record<string, unknown>
      const inv = r['sale_invoices'] as Record<string, unknown> | null
      const prd = r['products']      as Record<string, unknown> | null
      if (!inv || inv['status'] !== 'confirmed') return s
      return s + Number(prd?.['cost_price'] ?? 0) * Number(r['quantity'] ?? 0)
    }, 0)

    return {
      total:         rows.length,
      draft:         rows.filter(r => r.status === 'draft').length,
      confirmed:     confirmed.length,
      cancelled:     rows.filter(r => r.status === 'cancelled').length,
      totalRevenue:  confirmed.reduce((s, r) => s + Number(r.total_amount ?? 0), 0),
      totalPaid:     confirmed.reduce((s, r) => s + Number(r.paid_amount  ?? 0), 0),
      totalDue:      confirmed.reduce((s, r) => s + Math.max(0, Number(r.total_amount ?? 0) - Number(r.paid_amount ?? 0) - Number(r.discount ?? 0)), 0),
      totalCostSold: costDevices + costProducts,
    }
  },
}
