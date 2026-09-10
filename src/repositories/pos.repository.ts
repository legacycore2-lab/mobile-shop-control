// src/repositories/pos.repository.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
// ── SQL queries ONLY — no business logic ─────────────────────────────────────
import { supabase } from '@/lib/supabase'
import { buildSaleInvoiceView, adjustProductStock, n } from '@/lib/db-helpers'
import type {
  MobileDeviceView,
  SaleInvoice, SaleInvoiceView,
  SaleInvoiceDetail, SaleInvoiceDetailDevice, SaleInvoiceDetailProduct,
} from '@/types/database'

export interface SaleDeviceLine {
  device_id:            string
  actual_selling_price: number
}

export interface SaleProductLine {
  product_id: string
  quantity:   number
  unit_price: number
}

const INVOICE_SELECT = `
  *,
  customers!customer_id ( name, phone ),
  profiles!created_by ( full_name ),
  devices_agg:sale_invoice_devices ( id ),
  products_agg:sale_invoice_products ( id )
`

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
    return ((data ?? []) as unknown[]).map(r => buildSaleInvoiceView(r as Record<string, unknown>))
  },

  getById: async (id: string): Promise<SaleInvoiceDetail | null> => {
    const { data: inv, error: invErr } = await supabase
      .from('sale_invoices')
      .select(INVOICE_SELECT)
      .eq('id', id)
      .single()
    if (invErr) throw invErr
    if (!inv) return null

    const invoice = buildSaleInvoiceView(inv as unknown as Record<string, unknown>)

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

    const devices: SaleInvoiceDetailDevice[] = ((devRows ?? []) as unknown[]).map(row => {
      const d     = row as Record<string, unknown>
      const dev   = d['mobile_devices']      as Record<string, unknown> | null
      const model = dev?.['mobile_models']   as Record<string, unknown> | null
      const brand = model?.['mobile_brands'] as Record<string, unknown> | null
      return {
        id:                   String(d['id']),
        invoice_id:           String(d['invoice_id']),
        device_id:            String(d['device_id']),
        actual_selling_price: n(d['actual_selling_price']),
        created_at:           String(d['created_at']),
        brand_name:           String(brand?.['name'] ?? '—'),
        model_name:           String(model?.['name'] ?? '—'),
        imei1:                String(dev?.['imei1']  ?? '—'),
        cost_price:           n(dev?.['cost_price']),
      }
    })

    const { data: prdRows, error: prdErr } = await supabase
      .from('sale_invoice_products')
      .select(`*, products!product_id ( name, unit, cost_price )`)
      .eq('invoice_id', id)
    if (prdErr) throw prdErr

    const products: SaleInvoiceDetailProduct[] = ((prdRows ?? []) as unknown[]).map(row => {
      const p   = row as Record<string, unknown>
      const prd = p['products'] as Record<string, unknown> | null
      return {
        id:           String(p['id']),
        invoice_id:   String(p['invoice_id']),
        product_id:   String(p['product_id']),
        quantity:     n(p['quantity']),
        unit_price:   n(p['unit_price']),
        subtotal:     n(p['subtotal']),
        created_at:   String(p['created_at']),
        product_name: String(prd?.['name'] ?? '—'),
        unit:         String(prd?.['unit'] ?? 'قطعة'),
        cost_price:   n(prd?.['cost_price']),
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

  // Parallel update — each device has a different actual_selling_price so .in() isn't possible
  markDevicesSold: async (
    deviceIds: string[],
    invoiceId: string,
    customerId: string | null,
    soldById: string,
    priceMap: Map<string, number>,
  ): Promise<void> => {
    if (!deviceIds.length) return
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

  // Single .in() query — all devices share the same reset values
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

  // Shared helper from db-helpers — no duplication
  adjustProductStock,

  remove: async (id: string): Promise<void> => {
    const { error } = await supabase.from('sale_invoices').delete().eq('id', id)
    if (error) throw error
  },

  // Single RPC call — filter done in DB via NOT IN subquery
  getInStockDevices: async (): Promise<MobileDeviceView[]> => {
    const { data, error } = await supabase
      .rpc('get_in_stock_available_devices')
    if (error) throw error
    return (data ?? []) as MobileDeviceView[]
  },

  getStats: async () => {
    const { data, error } = await supabase
      .from('sale_invoices')
      .select('status, total_amount, paid_amount, discount')
    if (error) throw error

    const rows      = (data ?? []) as { status: string; total_amount: number; paid_amount: number; discount: number }[]
    const confirmed = rows.filter(r => r.status === 'confirmed')

    const { data: devCost, error: devErr } = await supabase
      .from('mobile_devices').select('cost_price').eq('status', 'sold')
    if (devErr) throw devErr

    const { data: prodLines, error: prodErr } = await supabase
      .from('sale_invoice_products')
      .select('quantity, products!product_id ( cost_price ), sale_invoices!invoice_id ( status )')
    if (prodErr) throw prodErr

    const costDevices  = (devCost ?? []).reduce<number>((s, r) => s + n((r as Record<string, unknown>)['cost_price']), 0)
    const costProducts = ((prodLines ?? []) as unknown[]).reduce<number>((s, row) => {
      const r   = row as Record<string, unknown>
      const inv = r['sale_invoices'] as Record<string, unknown> | null
      const prd = r['products']      as Record<string, unknown> | null
      if (!inv || inv['status'] !== 'confirmed') return s
      return s + n(prd?.['cost_price']) * n(r['quantity'])
    }, 0)

    return {
      total:         rows.length,
      draft:         rows.filter(r => r.status === 'draft').length,
      confirmed:     confirmed.length,
      cancelled:     rows.filter(r => r.status === 'cancelled').length,
      totalRevenue:  confirmed.reduce((s, r) => s + n(r.total_amount), 0),
      totalPaid:     confirmed.reduce((s, r) => s + n(r.paid_amount),  0),
      totalDue:      confirmed.reduce((s, r) => s + Math.max(0, n(r.total_amount) - n(r.paid_amount)), 0),
      totalCostSold: costDevices + costProducts,
    }
  },
}
