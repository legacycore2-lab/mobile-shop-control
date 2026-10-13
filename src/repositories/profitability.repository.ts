// src/repositories/profitability.repository.ts
// SQL queries فقط — بنود الفواتير المؤكدة (أجهزة + منتجات) بدون أي حساب
import { supabase } from '@/lib/supabase'

export interface SoldDeviceLine {
  invoice_id:    string
  invoice_total: number   // إجمالي الفاتورة بعد الخصم
  price:         number   // سعر بيع الجهاز قبل الخصم
  cost:          number   // تكلفة الجهاز الفعلية
  brand:         string
  model:         string
}

export interface SoldProductLine {
  invoice_id:    string
  invoice_total: number
  product_id:    string
  name:          string
  category:      string
  quantity:      number
  unit_price:    number
  unit_cost:     number   // أعلى سعر شراء حالي للمنتج
}

export interface SoldLines {
  devices:  SoldDeviceLine[]
  products: SoldProductLine[]
}

type Row  = Record<string, unknown>
type Page = { data: unknown[] | null; error: { message: string } | null }

const PAGE_SIZE = 1000

const asRow = (v: unknown): Row | null =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Row) : null

// PostgREST بيقطع النتيجة عند 1000 صف — بنجيب على صفحات عشان الأرقام ما تتقصش
async function fetchAll(page: (from: number, to: number) => PromiseLike<Page>): Promise<Row[]> {
  const rows: Row[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1)
    if (error) throw error
    const chunk = (data ?? []) as Row[]
    rows.push(...chunk)
    if (chunk.length < PAGE_SIZE) return rows
  }
}

export const profitabilityRepository = {

  getSoldLines: async (from?: string, to?: string): Promise<SoldLines> => {
    const deviceRows = await fetchAll((a, b) => {
      let q = supabase
        .from('sale_invoice_devices')
        .select(`
          id, invoice_id, actual_selling_price,
          mobile_devices!device_id (
            cost_price, selling_price,
            mobile_models!model_id ( name, mobile_brands!brand_id ( name ) )
          ),
          sale_invoices!invoice_id!inner ( status, invoice_date, total_amount )
        `)
        .eq('sale_invoices.status', 'confirmed')
      if (from) q = q.gte('sale_invoices.invoice_date', from)
      if (to)   q = q.lte('sale_invoices.invoice_date', to)
      return q.order('id').range(a, b)
    })

    const productRows = await fetchAll((a, b) => {
      let q = supabase
        .from('sale_invoice_products')
        .select(`
          id, invoice_id, quantity, unit_price, product_id,
          products!product_id ( name, cost_price, product_categories!category_id ( name ) ),
          sale_invoices!invoice_id!inner ( status, invoice_date, total_amount )
        `)
        .eq('sale_invoices.status', 'confirmed')
      if (from) q = q.gte('sale_invoices.invoice_date', from)
      if (to)   q = q.lte('sale_invoices.invoice_date', to)
      return q.order('id').range(a, b)
    })

    const devices = deviceRows.map((r): SoldDeviceLine => {
      const inv   = asRow(r['sale_invoices'])
      const dev   = asRow(r['mobile_devices'])
      const model = asRow(dev?.['mobile_models'])
      const brand = asRow(model?.['mobile_brands'])
      const actual = Number(r['actual_selling_price'] ?? 0)
      return {
        invoice_id:    String(r['invoice_id']),
        invoice_total: Number(inv?.['total_amount'] ?? 0),
        price:         actual > 0 ? actual : Number(dev?.['selling_price'] ?? 0),
        cost:          Number(dev?.['cost_price'] ?? 0),
        brand:         String(brand?.['name'] ?? '—'),
        model:         String(model?.['name'] ?? '—'),
      }
    })

    const products = productRows.map((r): SoldProductLine => {
      const inv  = asRow(r['sale_invoices'])
      const prod = asRow(r['products'])
      const cat  = asRow(prod?.['product_categories'])
      return {
        invoice_id:    String(r['invoice_id']),
        invoice_total: Number(inv?.['total_amount'] ?? 0),
        product_id:    String(r['product_id']),
        name:          String(prod?.['name'] ?? '—'),
        category:      String(cat?.['name'] ?? '—'),
        quantity:      Number(r['quantity'] ?? 0),
        unit_price:    Number(r['unit_price'] ?? 0),
        unit_cost:     Number(prod?.['cost_price'] ?? 0),
      }
    })

    return { devices, products }
  },
}
