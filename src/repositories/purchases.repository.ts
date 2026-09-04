import { supabase } from '@/lib/supabase'
import type {
  PurchaseInvoice, PurchaseInvoiceView,
  PurchaseInvoiceDevice, PurchaseInvoiceProduct,
} from '@/types/database'

type InvoiceInsert = Omit<PurchaseInvoice, 'id' | 'created_at' | 'updated_at' | 'remaining'>
type InvoiceUpdate = Partial<Omit<PurchaseInvoice, 'id' | 'created_at' | 'updated_at'>>

export interface InvoiceDeviceLine {
  device_id:  string
  cost_price: number
}

export interface InvoiceProductLine {
  product_id: string
  quantity:   number
  unit_price: number
}

export interface InvoiceDetail {
  invoice:  PurchaseInvoiceView
  devices:  (PurchaseInvoiceDevice & { brand_name: string; model_name: string; imei1: string })[]
  products: (PurchaseInvoiceProduct & { product_name: string; unit: string })[]
}

export const purchasesRepository = {

  // ── Next invoice number ───────────────────────────────────────────────────

  nextInvoiceNumber: async (): Promise<string> => {
    const { data, error } = await supabase.rpc('next_purchase_invoice_number')
    if (error) throw error
    return data as string
  },

  // ── Get all invoices ──────────────────────────────────────────────────────

  getAll: async (): Promise<PurchaseInvoiceView[]> => {
    const { data, error } = await supabase
      .rpc('get_purchase_invoices')
    if (error) throw error

    return ((data ?? []) as unknown[]).map(row => {
      const r = row as Record<string, unknown>
      return {
        ...(r as unknown as PurchaseInvoiceView),
        total_amount:    Number(r['total_amount']  ?? 0),
        paid_amount:     Number(r['paid_amount']   ?? 0),
        discount:        Number(r['discount']      ?? 0),
        remaining:       Number(r['remaining']     ?? 0),
        devices_count:   Number(r['devices_count'] ?? 0),
        products_count:  Number(r['products_count'] ?? 0),
        supplier_name:   String(r['supplier_name']   ?? '—'),
        created_by_name: String(r['created_by_name'] ?? '—'),
      } as PurchaseInvoiceView
    })
  },

  // ── Get invoice detail ────────────────────────────────────────────────────

  getById: async (id: string): Promise<InvoiceDetail | null> => {
    const { data: inv, error: invErr } = await supabase
      .from('purchase_invoices')
      .select(`
        id, invoice_number, supplier_id, invoice_date,
        total_amount, paid_amount, discount, remaining,
        notes, status, created_by, created_at, updated_at,
        suppliers!supplier_id ( name ),
        profiles!created_by ( full_name ),
        devices_agg:purchase_invoice_devices ( id ),
        products_agg:purchase_invoice_products ( id )
      `)
      .eq('id', id)
      .single()
    if (invErr) throw invErr
    if (!inv) return null

    const r   = inv as unknown as Record<string, unknown>
    const sup = r['suppliers']  as Record<string, unknown> | null
    const cby = r['profiles']   as Record<string, unknown> | null
    const dev = r['devices_agg']  as unknown[] | null
    const prd = r['products_agg'] as unknown[] | null
    const total    = Number(r['total_amount'] ?? 0)
    const paid     = Number(r['paid_amount']  ?? 0)
    const discount = Number(r['discount']     ?? 0)

    const invoice: PurchaseInvoiceView = {
      ...r,
      total_amount:    total,
      paid_amount:     paid,
      discount:        discount,
      supplier_name:   String(sup?.['name']       ?? '—'),
      created_by_name: String(cby?.['full_name']  ?? '—'),
      devices_count:   (dev  ?? []).length,
      products_count:  (prd  ?? []).length,
      remaining:       total - paid - discount,
    } as PurchaseInvoiceView

    // Devices
    const { data: devRows, error: devErr } = await supabase
      .from('purchase_invoice_devices')
      .select(`
        *,
        mobile_devices!device_id (
          imei1,
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
      const dev   = d['mobile_devices']   as Record<string, unknown> | null
      const model = dev?.['mobile_models'] as Record<string, unknown> | null
      const brand = model?.['mobile_brands'] as Record<string, unknown> | null
      return {
        id:         String(d['id']),
        invoice_id: String(d['invoice_id']),
        device_id:  String(d['device_id']),
        cost_price: Number(d['cost_price']),
        created_at: String(d['created_at']),
        brand_name: String(brand?.['name'] ?? '—'),
        model_name: String(model?.['name'] ?? '—'),
        imei1:      String(dev?.['imei1']  ?? '—'),
      }
    })

    // Products
    const { data: prdRows, error: prdErr } = await supabase
      .from('purchase_invoice_products')
      .select(`
        *,
        products!product_id ( name, unit )
      `)
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
      }
    })

    return { invoice, devices, products }
  },

  // ── Create invoice ────────────────────────────────────────────────────────

  create: async (payload: InvoiceInsert): Promise<PurchaseInvoice> => {
    const { data, error } = await supabase
      .from('purchase_invoices')
      .insert(payload as never)
      .select()
      .single()
    if (error) throw error
    return data as PurchaseInvoice
  },

  // ── Add device lines ──────────────────────────────────────────────────────

  addDeviceLines: async (invoiceId: string, lines: InvoiceDeviceLine[]): Promise<void> => {
    if (!lines.length) return
    const { error } = await supabase
      .from('purchase_invoice_devices')
      .insert(lines.map(l => ({ invoice_id: invoiceId, ...l })) as never)
    if (error) throw error
  },

  // ── Add product lines ─────────────────────────────────────────────────────

  addProductLines: async (invoiceId: string, lines: InvoiceProductLine[]): Promise<void> => {
    if (!lines.length) return
    const { error } = await supabase
      .from('purchase_invoice_products')
      .insert(lines.map(l => ({ invoice_id: invoiceId, ...l })) as never)
    if (error) throw error
  },

  // ── Update invoice ────────────────────────────────────────────────────────

  update: async (id: string, payload: InvoiceUpdate): Promise<PurchaseInvoice> => {
    const { data, error } = await supabase
      .from('purchase_invoices')
      .update(payload as never)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as PurchaseInvoice
  },

  // ── Confirm invoice — link devices ────────────────────────────────────────

  confirm: async (id: string): Promise<void> => {
    // 1. Update invoice status
    const { error: invErr } = await supabase
      .from('purchase_invoices')
      .update({ status: 'confirmed' } as never)
      .eq('id', id)
    if (invErr) throw invErr

    // 2. Get linked device lines → update purchase_invoice_id
    const { data: devLines, error: devErr } = await supabase
      .from('purchase_invoice_devices')
      .select('device_id')
      .eq('invoice_id', id)
    if (devErr) throw devErr

    if (devLines && devLines.length > 0) {
      const deviceIds = (devLines as { device_id: string }[]).map(d => d.device_id)
      const { error: updateErr } = await supabase
        .from('mobile_devices')
        .update({ purchase_invoice_id: id } as never)
        .in('id', deviceIds)
      if (updateErr) throw updateErr
    }

    // 3. Get product lines → update stock_qty (add purchased quantity)
    const { data: prodLines, error: prodErr } = await supabase
      .from('purchase_invoice_products')
      .select('product_id, quantity')
      .eq('invoice_id', id)
    if (prodErr) throw prodErr

    if (prodLines && prodLines.length > 0) {
      for (const line of prodLines as { product_id: string; quantity: number }[]) {
        // Fetch current stock
        const { data: prod, error: fetchErr } = await supabase
          .from('products')
          .select('stock_qty')
          .eq('id', line.product_id)
          .single()
        if (fetchErr) throw fetchErr

        const currentQty = (prod as { stock_qty: number }).stock_qty ?? 0
        const newQty = currentQty + line.quantity

        const { error: stockErr } = await supabase
          .from('products')
          .update({ stock_qty: newQty } as never)
          .eq('id', line.product_id)
        if (stockErr) throw stockErr
      }
    }
  },

  // ── Cancel invoice ────────────────────────────────────────────────────────

  cancel: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('purchase_invoices')
      .update({ status: 'cancelled' } as never)
      .eq('id', id)
    if (error) throw error
  },

  // ── Delete draft invoice ──────────────────────────────────────────────────

  remove: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('purchase_invoices')
      .delete()
      .eq('id', id)
    if (error) throw error
  },

  // ── Get devices by supplier (unlinked to any invoice) ────────────────────

  getUnlinkedDevicesBySupplier: async (supplierId: string) => {
    const { data, error } = await supabase
      .from('mobile_devices')
      .select(`
        id, imei1, cost_price,
        mobile_models!model_id (
          name,
          mobile_brands!brand_id ( name )
        )
      `)
      .eq('supplier_id', supplierId)
      .is('purchase_invoice_id', null)
    if (error) throw error

    return ((data ?? []) as unknown[]).map(row => {
      const r     = row as Record<string, unknown>
      const model = r['mobile_models']  as Record<string, unknown> | null
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

  // ── Stats ─────────────────────────────────────────────────────────────────

  getStats: async () => {
    const { data, error } = await supabase
      .from('purchase_invoices')
      .select('status, total_amount, paid_amount, discount')
    if (error) throw error

    const rows = (data ?? []) as { status: string; total_amount: number; paid_amount: number; discount: number }[]
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
