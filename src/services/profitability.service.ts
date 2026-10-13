// src/services/profitability.service.ts
// Business logic: توزيع إيراد الفاتورة (بعد الخصم) على بنودها وحساب ربح كل صنف
import { profitabilityRepository, type SoldLines } from '@/repositories/profitability.repository'

export type ProfitKind = 'all' | 'device' | 'product'

export interface ProfitRow {
  key:        string
  kind:       'device' | 'product'
  name:       string
  subtitle:   string       // الماركة للموبايلات، التصنيف للمنتجات
  units:      number
  revenue:    number
  cost:       number
  profit:     number
  margin_pct: number       // الربح ÷ التكلفة (نفس حساب باقي التقارير)
}

export interface ProfitTotals {
  units: number; revenue: number; cost: number; profit: number; margin_pct: number
}

interface Line {
  key: string; kind: 'device' | 'product'; name: string; subtitle: string
  units: number; value: number; cost: number
}

const marginPct = (profit: number, cost: number): number =>
  cost > 0 ? parseFloat(((profit / cost) * 100).toFixed(1)) : 0

export const profitabilityService = {

  // إيراد كل بند = حصته من قيمة الفاتورة × إجمالي الفاتورة بعد الخصم
  aggregate: (lines: SoldLines): ProfitRow[] => {
    const invoices = new Map<string, { total: number; lines: Line[] }>()
    const push = (invoiceId: string, total: number, line: Line) => {
      const inv = invoices.get(invoiceId) ?? { total, lines: [] }
      inv.lines.push(line)
      invoices.set(invoiceId, inv)
    }

    for (const d of lines.devices) {
      push(d.invoice_id, d.invoice_total, {
        key: `d::${d.brand}::${d.model}`, kind: 'device',
        name: `${d.brand} ${d.model}`, subtitle: d.brand,
        units: 1, value: d.price, cost: d.cost,
      })
    }
    for (const p of lines.products) {
      push(p.invoice_id, p.invoice_total, {
        key: `p::${p.product_id}`, kind: 'product',
        name: p.name, subtitle: p.category,
        units: p.quantity, value: p.unit_price * p.quantity, cost: p.unit_cost * p.quantity,
      })
    }

    const rows = new Map<string, ProfitRow>()
    for (const { total, lines: invLines } of invoices.values()) {
      const sumValue = invLines.reduce((s, l) => s + l.value, 0)
      for (const l of invLines) {
        const revenue = sumValue > 0 ? (l.value / sumValue) * total : 0
        const row = rows.get(l.key) ?? {
          key: l.key, kind: l.kind, name: l.name, subtitle: l.subtitle,
          units: 0, revenue: 0, cost: 0, profit: 0, margin_pct: 0,
        }
        row.units   += l.units
        row.revenue += revenue
        row.cost    += l.cost
        rows.set(l.key, row)
      }
    }

    return [...rows.values()]
      .map(r => {
        const profit = r.revenue - r.cost
        return { ...r, profit, margin_pct: marginPct(profit, r.cost) }
      })
      .sort((a, b) => b.profit - a.profit || a.name.localeCompare(b.name, 'ar'))
  },

  getRows: async (from?: string, to?: string): Promise<ProfitRow[]> =>
    profitabilityService.aggregate(await profitabilityRepository.getSoldLines(from, to)),

  select: (rows: ProfitRow[], kind: ProfitKind): ProfitRow[] =>
    kind === 'all' ? rows : rows.filter(r => r.kind === kind),

  totals: (rows: ProfitRow[]): ProfitTotals => {
    const t = rows.reduce(
      (s, r) => ({ units: s.units + r.units, revenue: s.revenue + r.revenue, cost: s.cost + r.cost }),
      { units: 0, revenue: 0, cost: 0 },
    )
    const profit = t.revenue - t.cost
    return { ...t, profit, margin_pct: marginPct(profit, t.cost) }
  },
}
