// src/repositories/pos.repository.ts
import { supabase } from '@/lib/supabase'
import type { MobileDeviceView } from '@/types/database'

export interface SaleInvoice {
  id:             string
  invoice_number: string
  customer_id:    string | null
  invoice_date:   string
  total_amount:   number
  paid_amount:    number
  discount:       number
  notes:          string | null
  status:         'draft' | 'confirmed' | 'cancelled'
  created_by:     string
  created_at:     string
  updated_at:     string
}

export interface SaleInvoiceView extends SaleInvoice {
  customer_name:   string | null
  customer_phone:  string | null
  created_by_name: string
  devices_count:   number
  products_count:  number
  remaining:       number
}

export interface SaleInvoiceDevice {
  id:                   string
  invoice_id:           string
  device_id:            string
  actual_selling_price: number
  created_at:           string
}

export interface SaleInvoiceProduct {
  id:         string
  invoice_id: string
  product_id: string
  quantity:   number
  unit_price: number
  subtotal:   number
  created_at: string
}

export interface SaleDeviceLine {
  device_id:            string
  actual_selling_price: number
}

export interface SaleProductLine {
  product_id: string
  quantity:   number
  unit_price: number
}

export interface SaleInvoiceDetail {
  invoice:  SaleInvoiceView
  devices:  (SaleInvoiceDevice & { brand_name: string; model_name: string; imei1: string; cost_price: number })[]
  products: (SaleInvoiceProduct & { product_name: string; unit: string; cost_price: number })[]
}

export const posRepository = {

  nextInvoiceNumber: async (): Promise<string> => {
    const { data, error } = await supabase.rpc('next_sale_invoice_number')
    if (error) {
      const ts = Date.now().toString().slice(-6)
      return `SAL-${ts}`
    }
    return data as string
  },

  getAll: async (): Promise<SaleInvoiceView[]> => {
    const { data, error } = await supabase
      .from('sale_invoices')
      .select(`
        *,
        customers!customer_id ( name, phone ),
        profiles!created_by ( full_name ),
        devices_agg:sale_invoice_devices ( id ),
        products_agg:sale_invoice_products ( id )
      `)
      .order('created_at', { ascending: false })
    if (error) throw error

    return ((data ?? []) as unknown[]).map(row => {
      const r    = row as Record<string, unknown>
      const cust = r['customers'] as Record<string, unknown> | null
      const cby  = r['profiles']  as Record<string, unknown> | null
      const dev  = r['devices_agg']  as unknown[] | null
      const prd  = r['products_agg'] as unknown[] | null
      const total    = Number(r['total_amount'] ?? 0)
      const paid     = Number(r['paid_amount']  ?? 0)
      const discount = Number(r['discount']     ?? 0)
      return {
        ...r,
        customer_name:   (cust?.['name']       as string | null) ?? null,
        customer_phone:  (cust?.['phone']      as string | null) ?? null,
        created_by_name: String(cby?.['full_name'] ?? '—'),
        devices_count:   (dev  ?? []).length,
        products_count:  (prd  ?? []).length,
        remaining:       Math.max(0, total - paid - discount),
      } as SaleInvoiceView
    })
  },

  getById: async (id: string): Promise<SaleInvoiceDetail | null> => {
    const { data: inv, error: invErr } = await supabase
      .from('sale_invoices')
      .select(`
        *,
        customers!customer_id ( name, phone ),
        profiles!created_by ( full_name ),
        devices_agg:sale_invoice_devices ( id ),
        products_agg:sale_invoice_products ( id )
      `)
      .eq('id', id)
      .single()
    if (invErr) throw invErr
    if (!inv) return null

    const r    = inv as unknown as Record<string, unknown>
    const cust = r['customers'] as Record<string, unknown> | null
    const cby  = r['profiles']  as Record<string, unknown> | null
    const dev  = r['devices_agg']  as unknown[] | null
    const prd  = r['products_agg'] as unknown[] | null
    const total    = Number(r['total_amount'] ?? 0)
    const paid     = Number(r['paid_amount']  ?? 0)
    const discount = Number(r['discount']     ?? 0)

    const invoice: SaleInvoiceView = {
      ...r,
      customer_name:   (cust?.['name']       as string | null) ?? null,
      customer_phone:  (cust?.['phone']      as string | null) ?? null,
      created_by_name: String(cby?.['full_name'] ?? '—'),
      devices_count:   (dev  ?? []).length,
      products_count:  (prd  ?? []).length,
      remaining:       Math.max(0, total - paid - discount),
    } as SaleInvoiceView

    const { data: devRows, error: devErr } = await supabase
      .from('sale_invoice_devices')
      .select(`
        *,
        mobile_devices!device_id (
          imei1, cost_price,
          mobile_models!model_id (
            name,
            mobile_brands!brand_id ( name )
          )
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

  create: async (payload: Omit<SaleInvoice, 'id' | 'created_at' | 'updated_at'>): Promise<SaleInvoice> => {
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

  confirm: async (invoiceId: string, customerId: string | null, soldById: string): Promise<void> => {
    const { error: invErr } = await supabase
      .from('sale_invoices')
      .update({ status: 'confirmed' } as never)
      .eq('id', invoiceId)
    if (invErr) throw invErr

    const { data: devLines, error: devErr } = await supabase
      .from('sale_invoice_devices')
      .select('device_id, actual_selling_price')
      .eq('invoice_id', invoiceId)
    if (devErr) throw devErr

    for (const line of (devLines ?? []) as { device_id: string; actual_selling_price: number }[]) {
      const { error: updateErr } = await supabase
        .from('mobile_devices')
        .update({
          status:               'sold',
          sale_invoice_id:      invoiceId,
          sold_to_customer_id:  customerId,
          actual_selling_price: line.actual_selling_price,
          sold_at:              new Date().toISOString(),
          sold_by:              soldById,
        } as never)
        .eq('id', line.device_id)
      if (updateErr) throw updateErr
    }

    const { data: prdLines, error: prdErr } = await supabase
      .from('sale_invoice_products')
      .select('product_id, quantity')
      .eq('invoice_id', invoiceId)
    if (prdErr) throw prdErr

    for (const line of (prdLines ?? []) as { product_id: string; quantity: number }[]) {
      const { data: prod } = await supabase
        .from('products')
        .select('stock_qty')
        .eq('id', line.product_id)
        .single()
      if (prod) {
        await supabase
          .from('products')
          .update({ stock_qty: Math.max(0, (prod as { stock_qty: number }).stock_qty - line.quantity) } as never)
          .eq('id', line.product_id)
      }
    }
  },

  // ── إلغاء فاتورة (مسودة أو مؤكدة) مع استرجاع الأجهزة والمنتجات ─────────
  cancel: async (id: string, isConfirmed: boolean): Promise<void> => {
    // 1. غيّر حالة الفاتورة
    const { error: invErr } = await supabase
      .from('sale_invoices')
      .update({ status: 'cancelled' } as never)
      .eq('id', id)
    if (invErr) throw invErr

    if (isConfirmed) {
      // 2. أرجع الأجهزة لـ in_stock
      const { data: devLines, error: devErr } = await supabase
        .from('sale_invoice_devices')
        .select('device_id')
        .eq('invoice_id', id)
      if (devErr) throw devErr

      for (const line of (devLines ?? []) as { device_id: string }[]) {
        await supabase
          .from('mobile_devices')
          .update({
            status:               'in_stock',
            sale_invoice_id:      null,
            sold_to_customer_id:  null,
            actual_selling_price: null,
            sold_at:              null,
            sold_by:              null,
          } as never)
          .eq('id', line.device_id)
      }

      // 3. أرجع stock المنتجات
      const { data: prdLines, error: prdErr } = await supabase
        .from('sale_invoice_products')
        .select('product_id, quantity')
        .eq('invoice_id', id)
      if (prdErr) throw prdErr

      for (const line of (prdLines ?? []) as { product_id: string; quantity: number }[]) {
        const { data: prod } = await supabase
          .from('products')
          .select('stock_qty')
          .eq('id', line.product_id)
          .single()
        if (prod) {
          await supabase
            .from('products')
            .update({ stock_qty: (prod as { stock_qty: number }).stock_qty + line.quantity } as never)
            .eq('id', line.product_id)
        }
      }
    }
  },

  remove: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('sale_invoices')
      .delete()
      .eq('id', id)
    if (error) throw error
  },

  getInStockDevices: async (): Promise<MobileDeviceView[]> => {
    const { data, error } = await supabase
      .from('mobile_devices')
      .select(`
        *,
        mobile_models!model_id (
          name,
          mobile_brands!brand_id ( name )
        ),
        suppliers!supplier_id ( name )
      `)
      .eq('status', 'in_stock')
      .order('created_at', { ascending: false })
    if (error) throw error

    return ((data ?? []) as unknown[]).map(row => {
      const r     = row as Record<string, unknown>
      const model = r['mobile_models']   as Record<string, unknown> | null
      const brand = model?.['mobile_brands'] as Record<string, unknown> | null
      const sup   = r['suppliers']       as Record<string, unknown> | null
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

  getStats: async () => {
    const { data, error } = await supabase
      .from('sale_invoices')
      .select('status, total_amount, paid_amount, discount')
    if (error) throw error

    const rows      = (data ?? []) as { status: string; total_amount: number; paid_amount: number; discount: number }[]
    const confirmed = rows.filter(r => r.status === 'confirmed')
    return {
      total:        rows.length,
      draft:        rows.filter(r => r.status === 'draft').length,
      confirmed:    confirmed.length,
      totalRevenue: confirmed.reduce((s, r) => s + (r.total_amount ?? 0), 0),
      totalPaid:    confirmed.reduce((s, r) => s + (r.paid_amount  ?? 0), 0),
      totalDue:     confirmed.reduce((s, r) => s + Math.max(0, (r.total_amount ?? 0) - (r.paid_amount ?? 0) - (r.discount ?? 0)), 0),
    }
  },
}
