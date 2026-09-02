// src/repositories/reports.repository.ts
import { supabase } from '@/lib/supabase'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DeviceSalesSummary {
  brand_name:    string
  model_name:    string
  total_units:   number
  total_cost:    number
  total_revenue: number
  profit:        number
  margin_pct:    number
}

export interface StockValueRow {
  brand_name:    string
  model_name:    string
  count:         number
  total_cost:    number
  total_selling: number
}

export interface SupplierPurchaseSummary {
  supplier_id:   string
  supplier_name: string
  total_devices: number
  total_cost:    number
}

export interface DeviceStatusCount {
  status: string
  count:  number
}

export interface DailyActivity {
  date:          string
  devices_added: number
  devices_sold:  number
}

export interface ProductStockAlert {
  product_id:    string
  product_name:  string
  category_name: string
  stock_qty:     number
  reorder_level: number
  cost_price:    number
  selling_price: number
  stock_value:   number
}

export interface TopCustomer {
  customer_id:   string
  customer_name: string
  device_count:  number
  total_spent:   number
}

// ── SOH + Movement ────────────────────────────────────────────────────────────

export interface ProductMovementRow {
  id:            string
  name:          string
  category_name: string
  sku:           string | null
  unit:          string
  opening_stock: number   // رصيد أول الفترة (تقريبي)
  purchased:     number   // مشتريات في الفترة
  sold:          number   // مبيعات في الفترة
  current_stock: number   // رصيد حالي
  cost_price:    number
  selling_price: number
  stock_value:   number   // قيمة الرصيد الحالي
  reorder_level: number
  needs_reorder: boolean
}

export interface DeviceMovementRow {
  brand_name:    string
  model_name:    string
  total:         number   // إجمالي الأجهزة
  in_stock:      number   // في المخزون الآن
  sold_in_period:number   // بيع في الفترة
  purchased_in_period: number // اشتري في الفترة
  avg_cost:      number
  avg_sell:      number
  total_revenue: number
  total_profit:  number
}

// ── Repository ────────────────────────────────────────────────────────────────

export const reportsRepository = {

  // ── مبيعات الأجهزة ────────────────────────────────────────────────────────
  getDeviceSalesSummary: async (): Promise<DeviceSalesSummary[]> => {
    const { data, error } = await supabase
      .from('mobile_devices')
      .select(`
        cost_price, actual_selling_price, selling_price, status,
        mobile_models!model_id ( name, mobile_brands!brand_id ( name ) )
      `)
      .eq('status', 'sold')
    if (error) throw error

    const map = new Map<string, DeviceSalesSummary>()
    for (const row of (data ?? []) as unknown[]) {
      const r     = row as Record<string, unknown>
      const model = r['mobile_models'] as Record<string, unknown> | null
      const brand = model?.['mobile_brands'] as Record<string, unknown> | null
      const bname = String(brand?.['name'] ?? '—')
      const mname = String(model?.['name'] ?? '—')
      const key   = `${bname}::${mname}`
      const cost  = Number(r['cost_price']           ?? 0)
      const rev   = Number(r['actual_selling_price'] ?? r['selling_price'] ?? 0)

      if (!map.has(key)) {
        map.set(key, { brand_name: bname, model_name: mname,
          total_units: 0, total_cost: 0, total_revenue: 0, profit: 0, margin_pct: 0 })
      }
      const e = map.get(key)!
      e.total_units++
      e.total_cost    += cost
      e.total_revenue += rev
    }

    return Array.from(map.values()).map(e => ({
      ...e,
      profit:     e.total_revenue - e.total_cost,
      margin_pct: e.total_cost > 0
        ? parseFloat(((e.total_revenue - e.total_cost) / e.total_cost * 100).toFixed(1))
        : 0,
    })).sort((a, b) => b.profit - a.profit)
  },

  // ── قيمة المخزون ──────────────────────────────────────────────────────────
  getStockValue: async (): Promise<StockValueRow[]> => {
    const { data, error } = await supabase
      .from('mobile_devices')
      .select(`
        cost_price, selling_price, status,
        mobile_models!model_id ( name, mobile_brands!brand_id ( name ) )
      `)
      .eq('status', 'in_stock')
    if (error) throw error

    const map = new Map<string, StockValueRow>()
    for (const row of (data ?? []) as unknown[]) {
      const r     = row as Record<string, unknown>
      const model = r['mobile_models'] as Record<string, unknown> | null
      const brand = model?.['mobile_brands'] as Record<string, unknown> | null
      const bname = String(brand?.['name'] ?? '—')
      const mname = String(model?.['name'] ?? '—')
      const key   = `${bname}::${mname}`

      if (!map.has(key)) map.set(key, { brand_name: bname, model_name: mname, count: 0, total_cost: 0, total_selling: 0 })
      const e = map.get(key)!
      e.count++
      e.total_cost    += Number(r['cost_price']    ?? 0)
      e.total_selling += Number(r['selling_price'] ?? 0)
    }
    return Array.from(map.values()).sort((a, b) => b.total_cost - a.total_cost)
  },

  // ── مشتريات الموردين ──────────────────────────────────────────────────────
  getSupplierPurchases: async (): Promise<SupplierPurchaseSummary[]> => {
    const { data, error } = await supabase
      .from('mobile_devices')
      .select('cost_price, suppliers!supplier_id ( id, name )')
    if (error) throw error

    const map = new Map<string, SupplierPurchaseSummary>()
    for (const row of (data ?? []) as unknown[]) {
      const r    = row as Record<string, unknown>
      const sup  = r['suppliers'] as Record<string, unknown> | null
      if (!sup) continue
      const id   = String(sup['id'])
      const name = String(sup['name'])
      if (!map.has(id)) map.set(id, { supplier_id: id, supplier_name: name, total_devices: 0, total_cost: 0 })
      const e = map.get(id)!
      e.total_devices++
      e.total_cost += Number(r['cost_price'] ?? 0)
    }
    return Array.from(map.values()).sort((a, b) => b.total_cost - a.total_cost)
  },

  // ── توزيع حالات الأجهزة ───────────────────────────────────────────────────
  getDeviceStatusCounts: async (): Promise<DeviceStatusCount[]> => {
    const { data, error } = await supabase.from('mobile_devices').select('status')
    if (error) throw error
    const map = new Map<string, number>()
    for (const row of (data ?? []) as unknown[]) {
      const status = String((row as Record<string, unknown>)['status'])
      map.set(status, (map.get(status) ?? 0) + 1)
    }
    return Array.from(map.entries()).map(([status, count]) => ({ status, count }))
  },

  // ── نشاط الأجهزة آخر 30 يوم ──────────────────────────────────────────────
  getDailyActivity: async (): Promise<DailyActivity[]> => {
    const since = new Date(); since.setDate(since.getDate() - 29)
    const sinceStr = since.toISOString().split('T')[0]
    const { data, error } = await supabase
      .from('mobile_devices').select('created_at, sold_at, status').gte('created_at', sinceStr)
    if (error) throw error

    const map = new Map<string, { added: number; sold: number }>()
    for (let i = 0; i < 30; i++) {
      const d = new Date(); d.setDate(d.getDate() - (29 - i))
      map.set(d.toISOString().split('T')[0], { added: 0, sold: 0 })
    }
    for (const row of (data ?? []) as unknown[]) {
      const r = row as Record<string, unknown>
      const addedOn = String(r['created_at'] ?? '').split('T')[0]
      const soldOn  = r['sold_at'] ? String(r['sold_at']).split('T')[0] : null
      if (map.has(addedOn)) map.get(addedOn)!.added++
      if (soldOn && map.has(soldOn)) map.get(soldOn)!.sold++
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, devices_added: v.added, devices_sold: v.sold }))
  },

  // ── تنبيهات المخزون ───────────────────────────────────────────────────────
  getLowStockDetailed: async (): Promise<ProductStockAlert[]> => {
    const { data, error } = await supabase
      .from('products')
      .select('id, name, stock_qty, reorder_level, cost_price, selling_price, is_active, product_categories!category_id ( name )')
      .eq('is_active', true)
    if (error) throw error
    return ((data ?? []) as unknown[])
      .map(row => {
        const r   = row as Record<string, unknown>
        const cat = r['product_categories'] as Record<string, unknown> | null
        const qty = Number(r['stock_qty'] ?? 0)
        return {
          product_id:    String(r['id']),
          product_name:  String(r['name']),
          category_name: String(cat?.['name'] ?? '—'),
          stock_qty:     qty,
          reorder_level: Number(r['reorder_level'] ?? 0),
          cost_price:    Number(r['cost_price']    ?? 0),
          selling_price: Number(r['selling_price'] ?? 0),
          stock_value:   qty * Number(r['cost_price'] ?? 0),
        }
      })
      .filter(p => p.stock_qty <= p.reorder_level)
      .sort((a, b) => a.stock_qty - b.stock_qty)
  },

  // ── أفضل العملاء ──────────────────────────────────────────────────────────
  getTopCustomers: async (): Promise<TopCustomer[]> => {
    const { data, error } = await supabase
      .from('mobile_devices')
      .select('actual_selling_price, selling_price, customers!sold_to_customer_id ( id, name )')
      .eq('status', 'sold').not('sold_to_customer_id', 'is', null)
    if (error) throw error
    const map = new Map<string, TopCustomer>()
    for (const row of (data ?? []) as unknown[]) {
      const r    = row as Record<string, unknown>
      const cust = r['customers'] as Record<string, unknown> | null
      if (!cust) continue
      const id  = String(cust['id'])
      const rev = Number(r['actual_selling_price'] ?? r['selling_price'] ?? 0)
      if (!map.has(id)) map.set(id, { customer_id: id, customer_name: String(cust['name']), device_count: 0, total_spent: 0 })
      const e = map.get(id)!; e.device_count++; e.total_spent += rev
    }
    return Array.from(map.values()).sort((a, b) => b.total_spent - a.total_spent).slice(0, 10)
  },

  // ── SOH + Movement للمنتجات (بفلتر تاريخ) ────────────────────────────────
  getProductMovement: async (from: string, to: string): Promise<ProductMovementRow[]> => {
    // كل المنتجات النشطة
    const { data: prods, error: prodErr } = await supabase
      .from('products')
      .select('id, name, sku, unit, stock_qty, cost_price, selling_price, reorder_level, product_categories!category_id ( name )')
      .eq('is_active', true)
      .order('name')
    if (prodErr) throw prodErr

    // بنود المبيعات في الفترة
    const toEnd = to + 'T23:59:59'
    const { data: saleLines, error: saleErr } = await supabase
      .from('sale_invoice_products')
      .select('product_id, quantity, sale_invoices!invoice_id ( invoice_date, status )')
      .gte('sale_invoices.invoice_date', from)
      .lte('sale_invoices.invoice_date', to)
    if (saleErr) throw saleErr

    // بنود المشتريات في الفترة
    const { data: purchLines, error: purchErr } = await supabase
      .from('purchase_invoice_products')
      .select('product_id, quantity, purchase_invoices!invoice_id ( invoice_date, status )')
      .gte('purchase_invoices.invoice_date', from)
      .lte('purchase_invoices.invoice_date', to)
    if (purchErr) throw purchErr

    // تجميع المبيعات
    const soldMap = new Map<string, number>()
    for (const row of (saleLines ?? []) as unknown[]) {
      const r    = row as Record<string, unknown>
      const inv  = r['sale_invoices'] as Record<string, unknown> | null
      if (!inv || inv['status'] === 'cancelled') continue
      const pid  = String(r['product_id'])
      const qty  = Number(r['quantity'] ?? 0)
      soldMap.set(pid, (soldMap.get(pid) ?? 0) + qty)
    }

    // تجميع المشتريات
    const purchMap = new Map<string, number>()
    for (const row of (purchLines ?? []) as unknown[]) {
      const r    = row as Record<string, unknown>
      const inv  = r['purchase_invoices'] as Record<string, unknown> | null
      if (!inv || inv['status'] === 'cancelled') continue
      const pid  = String(r['product_id'])
      const qty  = Number(r['quantity'] ?? 0)
      purchMap.set(pid, (purchMap.get(pid) ?? 0) + qty)
    }

    return ((prods ?? []) as unknown[]).map(row => {
      const r    = row as Record<string, unknown>
      const cat  = r['product_categories'] as Record<string, unknown> | null
      const pid  = String(r['id'])
      const curr = Number(r['stock_qty']     ?? 0)
      const cost = Number(r['cost_price']    ?? 0)
      const sell = Number(r['selling_price'] ?? 0)
      const reorder = Number(r['reorder_level'] ?? 0)
      const sold  = soldMap.get(pid)  ?? 0
      const purch = purchMap.get(pid) ?? 0
      // رصيد أول الفترة = الرصيد الحالي - مشتريات الفترة + مبيعات الفترة
      const opening = curr - purch + sold

      return {
        id:            pid,
        name:          String(r['name']),
        category_name: String(cat?.['name'] ?? '—'),
        sku:           r['sku'] ? String(r['sku']) : null,
        unit:          String(r['unit'] ?? 'قطعة'),
        opening_stock: Math.max(0, opening),
        purchased:     purch,
        sold,
        current_stock: curr,
        cost_price:    cost,
        selling_price: sell,
        stock_value:   curr * cost,
        reorder_level: reorder,
        needs_reorder: curr <= reorder,
      } satisfies ProductMovementRow
    })
  },

  // ── SOH + Movement للأجهزة (بفلتر تاريخ) ────────────────────────────────
  getDeviceMovement: async (from: string, to: string): Promise<DeviceMovementRow[]> => {
    const { data, error } = await supabase
      .from('mobile_devices')
      .select(`
        status, cost_price, actual_selling_price, selling_price,
        created_at, sold_at,
        mobile_models!model_id ( name, mobile_brands!brand_id ( name ) )
      `)
    if (error) throw error

    const map = new Map<string, DeviceMovementRow>()

    for (const row of (data ?? []) as unknown[]) {
      const r      = row as Record<string, unknown>
      const model  = r['mobile_models']  as Record<string, unknown> | null
      const brand  = model?.['mobile_brands'] as Record<string, unknown> | null
      const bname  = String(brand?.['name'] ?? '—')
      const mname  = String(model?.['name'] ?? '—')
      const key    = `${bname}::${mname}`
      const status = String(r['status'] ?? '')
      const cost   = Number(r['cost_price'] ?? 0)
      const rev    = Number(r['actual_selling_price'] ?? r['selling_price'] ?? 0)
      const createdOn = String(r['created_at'] ?? '').split('T')[0]
      const soldOn    = r['sold_at'] ? String(r['sold_at']).split('T')[0] : null

      if (!map.has(key)) {
        map.set(key, {
          brand_name: bname, model_name: mname,
          total: 0, in_stock: 0,
          sold_in_period: 0, purchased_in_period: 0,
          avg_cost: 0, avg_sell: 0,
          total_revenue: 0, total_profit: 0,
        })
      }
      const e = map.get(key)!
      e.total++
      if (status === 'in_stock') e.in_stock++
      // اشتري في الفترة
      if (createdOn >= from && createdOn <= to) e.purchased_in_period++
      // بيع في الفترة
      if (soldOn && soldOn >= from && soldOn <= to && status === 'sold') {
        e.sold_in_period++
        e.total_revenue += rev
        e.total_profit  += rev - cost
      }
    }

    return Array.from(map.values())
      .map(e => ({
        ...e,
        avg_cost: e.total > 0 ? Math.round(e.total_revenue / Math.max(e.sold_in_period, 1)) : 0,
      }))
      .sort((a, b) => b.sold_in_period - a.sold_in_period)
  },
}
