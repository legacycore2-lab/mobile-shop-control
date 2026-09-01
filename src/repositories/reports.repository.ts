import { supabase } from '@/lib/supabase'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DeviceSalesSummary {
  brand_name:   string
  model_name:   string
  total_units:  number
  total_cost:   number
  total_revenue: number
  profit:       number
  margin_pct:   number
}

export interface StockValueRow {
  brand_name:   string
  model_name:   string
  count:        number
  total_cost:   number
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

// ── Repository ────────────────────────────────────────────────────────────────

export const reportsRepository = {

  // مبيعات الأجهزة مجمعة حسب الماركة والموديل
  getDeviceSalesSummary: async (): Promise<DeviceSalesSummary[]> => {
    const { data, error } = await supabase
      .from('mobile_devices')
      .select(`
        cost_price,
        actual_selling_price,
        selling_price,
        status,
        mobile_models!model_id (
          name,
          mobile_brands!brand_id ( name )
        )
      `)
      .eq('status', 'sold')
    if (error) throw error

    const map = new Map<string, DeviceSalesSummary>()
    for (const row of (data ?? []) as unknown[]) {
      const r     = row as Record<string, unknown>
      const model = r['mobile_models'] as Record<string, unknown> | null
      const brand = model ? (model['mobile_brands'] as Record<string, unknown> | null) : null
      const key   = `${brand?.['name'] ?? '—'}__${model?.['name'] ?? '—'}`
      const cost  = Number(r['cost_price'] ?? 0)
      const rev   = Number(r['actual_selling_price'] ?? r['selling_price'] ?? 0)

      if (!map.has(key)) {
        map.set(key, {
          brand_name:    String(brand?.['name'] ?? '—'),
          model_name:    String(model?.['name'] ?? '—'),
          total_units:   0,
          total_cost:    0,
          total_revenue: 0,
          profit:        0,
          margin_pct:    0,
        })
      }
      const entry = map.get(key)!
      entry.total_units++
      entry.total_cost    += cost
      entry.total_revenue += rev
    }

    return Array.from(map.values()).map(e => ({
      ...e,
      profit:     e.total_revenue - e.total_cost,
      margin_pct: e.total_cost > 0
        ? parseFloat((((e.total_revenue - e.total_cost) / e.total_cost) * 100).toFixed(1))
        : 0,
    })).sort((a, b) => b.profit - a.profit)
  },

  // قيمة المخزون الحالي حسب الماركة
  getStockValue: async (): Promise<StockValueRow[]> => {
    const { data, error } = await supabase
      .from('mobile_devices')
      .select(`
        cost_price,
        selling_price,
        mobile_models!model_id (
          name,
          mobile_brands!brand_id ( name )
        )
      `)
      .eq('status', 'in_stock')
    if (error) throw error

    const map = new Map<string, StockValueRow>()
    for (const row of (data ?? []) as unknown[]) {
      const r     = row as Record<string, unknown>
      const model = r['mobile_models'] as Record<string, unknown> | null
      const brand = model ? (model['mobile_brands'] as Record<string, unknown> | null) : null
      const key   = String(brand?.['name'] ?? '—')

      if (!map.has(key)) {
        map.set(key, { brand_name: key, model_name: '', count: 0, total_cost: 0, total_selling: 0 })
      }
      const entry = map.get(key)!
      entry.count++
      entry.total_cost    += Number(r['cost_price']    ?? 0)
      entry.total_selling += Number(r['selling_price'] ?? 0)
    }

    return Array.from(map.values()).sort((a, b) => b.total_cost - a.total_cost)
  },

  // مشتريات من الموردين
  getSupplierPurchases: async (): Promise<SupplierPurchaseSummary[]> => {
    const { data, error } = await supabase
      .from('mobile_devices')
      .select(`
        cost_price,
        suppliers!supplier_id ( id, name )
      `)
    if (error) throw error

    const map = new Map<string, SupplierPurchaseSummary>()
    for (const row of (data ?? []) as unknown[]) {
      const r   = row as Record<string, unknown>
      const sup = r['suppliers'] as Record<string, unknown> | null
      const id  = String(sup?.['id'] ?? 'unknown')
      const nm  = String(sup?.['name'] ?? '—')

      if (!map.has(id)) {
        map.set(id, { supplier_id: id, supplier_name: nm, total_devices: 0, total_cost: 0 })
      }
      const entry = map.get(id)!
      entry.total_devices++
      entry.total_cost += Number(r['cost_price'] ?? 0)
    }

    return Array.from(map.values()).sort((a, b) => b.total_cost - a.total_cost)
  },

  // توزيع حالات الأجهزة
  getDeviceStatusCounts: async (): Promise<DeviceStatusCount[]> => {
    const { data, error } = await supabase
      .from('mobile_devices')
      .select('status')
    if (error) throw error

    const map = new Map<string, number>()
    for (const row of (data ?? []) as unknown[]) {
      const status = String((row as Record<string, unknown>)['status'])
      map.set(status, (map.get(status) ?? 0) + 1)
    }
    return Array.from(map.entries()).map(([status, count]) => ({ status, count }))
  },

  // نشاط الأجهزة آخر 30 يوم
  getDailyActivity: async (): Promise<DailyActivity[]> => {
    const since = new Date()
    since.setDate(since.getDate() - 29)
    const sinceStr = since.toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('mobile_devices')
      .select('created_at, sold_at, status')
      .gte('created_at', sinceStr)
    if (error) throw error

    const map = new Map<string, { added: number; sold: number }>()

    // init all 30 days
    for (let i = 0; i < 30; i++) {
      const d = new Date()
      d.setDate(d.getDate() - (29 - i))
      const key = d.toISOString().split('T')[0]
      map.set(key, { added: 0, sold: 0 })
    }

    for (const row of (data ?? []) as unknown[]) {
      const r       = row as Record<string, unknown>
      const addedOn = String(r['created_at'] ?? '').split('T')[0]
      const soldOn  = r['sold_at'] ? String(r['sold_at']).split('T')[0] : null

      if (map.has(addedOn)) map.get(addedOn)!.added++
      if (soldOn && map.has(soldOn)) map.get(soldOn)!.sold++
    }

    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, devices_added: v.added, devices_sold: v.sold }))
  },

  // منتجات مخزون منخفض مع القيمة
  getLowStockDetailed: async (): Promise<ProductStockAlert[]> => {
    const { data, error } = await supabase
      .from('products')
      .select(`
        id, name, stock_qty, reorder_level, cost_price, selling_price, is_active,
        product_categories!category_id ( name )
      `)
      .eq('is_active', true)
    if (error) throw error

    return ((data ?? []) as unknown[])
      .map(row => {
        const r   = row as Record<string, unknown>
        const cat = r['product_categories'] as Record<string, unknown> | null
        const qty = Number(r['stock_qty'] ?? 0)
        const reorder = Number(r['reorder_level'] ?? 0)
        return {
          product_id:    String(r['id']),
          product_name:  String(r['name']),
          category_name: String(cat?.['name'] ?? '—'),
          stock_qty:     qty,
          reorder_level: reorder,
          cost_price:    Number(r['cost_price']    ?? 0),
          selling_price: Number(r['selling_price'] ?? 0),
          stock_value:   qty * Number(r['cost_price'] ?? 0),
        }
      })
      .filter(p => p.stock_qty <= p.reorder_level)
      .sort((a, b) => a.stock_qty - b.stock_qty)
  },

  // أفضل العملاء
  getTopCustomers: async (): Promise<TopCustomer[]> => {
    const { data, error } = await supabase
      .from('mobile_devices')
      .select(`
        actual_selling_price, selling_price,
        customers!sold_to_customer_id ( id, name )
      `)
      .eq('status', 'sold')
      .not('sold_to_customer_id', 'is', null)
    if (error) throw error

    const map = new Map<string, TopCustomer>()
    for (const row of (data ?? []) as unknown[]) {
      const r    = row as Record<string, unknown>
      const cust = r['customers'] as Record<string, unknown> | null
      if (!cust) continue
      const id  = String(cust['id'])
      const nm  = String(cust['name'])
      const rev = Number(r['actual_selling_price'] ?? r['selling_price'] ?? 0)

      if (!map.has(id)) {
        map.set(id, { customer_id: id, customer_name: nm, device_count: 0, total_spent: 0 })
      }
      const entry = map.get(id)!
      entry.device_count++
      entry.total_spent += rev
    }

    return Array.from(map.values()).sort((a, b) => b.total_spent - a.total_spent).slice(0, 10)
  },
}
