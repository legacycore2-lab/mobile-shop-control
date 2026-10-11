// src/services/catalog.service.ts
import { catalogRepository } from '@/repositories/catalog.repository'
import { CONDITION_MAP } from '@/constants/statusMaps'
import type { PublicCatalog, CatalogOrderItemInput, CatalogOrderResult } from '@/types/database'

export type CatalogGroup = 'device' | 'accessory' | 'spare_part'

export interface CatalogEntry {
  key:      string
  kind:     'product' | 'device'
  ids:      string[]
  group:    CatalogGroup
  brand:    string | null
  title:    string
  subtitle: string
  details:  string[]
  price:    number
  maxQty:   number            // 0 = نفد
  image:    string | null
}

export interface BrandCount { brand: string; count: number }

export interface CartLine {
  key:       string
  kind:      'product' | 'device'
  ids:       string[]
  title:     string
  unitPrice: number
  quantity:  number
  maxQty:    number
}

export interface OrderForm { name: string; phone: string; notes: string }

const MAX_ORDER_ITEMS = 30

export const catalogService = {

  getCatalog: (): Promise<PublicCatalog> => catalogRepository.getPublic(),

  // ── تحويل البيانات لقائمة عرض موحّدة (الأجهزة المتطابقة بتتجمّع) ───────────
  toEntries: (catalog: PublicCatalog): CatalogEntry[] => {
    const products: CatalogEntry[] = catalog.products.map(p => ({
      key:      `p-${p.id}`,
      kind:     'product',
      ids:      [p.id],
      group:    p.product_type,
      brand:    null,
      title:    p.name,
      subtitle: p.category,
      details:  [],
      price:    p.selling_price,
      maxQty:   Math.max(p.stock_qty, 0),
      image:    p.image_url,
    }))

    const grouped = new Map<string, CatalogEntry>()
    for (const d of catalog.devices) {
      const key = ['d', d.brand, d.model, d.storage, d.color, d.condition, d.selling_price, d.battery_health, d.warranty_months].join('|')
      const existing = grouped.get(key)
      if (existing) {
        existing.ids.push(d.id)
        existing.maxQty = existing.ids.length
        continue
      }
      const details: string[] = [CONDITION_MAP[d.condition] ?? d.condition]
      if (d.storage) details.push(d.storage)
      if (d.color) details.push(d.color)
      if (d.battery_health) details.push(`بطارية ${d.battery_health}%`)
      if (d.warranty_months > 0) details.push(`ضمان ${d.warranty_months} شهر`)
      grouped.set(key, {
        key,
        kind:     'device',
        ids:      [d.id],
        group:    'device',
        brand:    d.brand,
        title:    `${d.brand} ${d.model}`,
        subtitle: 'موبايل',
        details,
        price:    d.selling_price,
        maxQty:   1,
        image:    d.image_url,
      })
    }

    return [...grouped.values(), ...products]
  },

  // ── الماركات المتاحة (عدد الأجهزة لكل ماركة) ─────────────────────────────────
  brandCounts: (entries: CatalogEntry[]): BrandCount[] => {
    const counts = new Map<string, number>()
    for (const e of entries) {
      if (e.kind !== 'device' || !e.brand) continue
      counts.set(e.brand, (counts.get(e.brand) ?? 0) + e.ids.length)
    }
    return [...counts.entries()]
      .map(([brand, count]) => ({ brand, count }))
      .sort((a, b) => b.count - a.count || a.brand.localeCompare(b.brand))
  },

  // ── السلة ───────────────────────────────────────────────────────────────────
  addToCart: (lines: CartLine[], entry: CatalogEntry): CartLine[] => {
    if (entry.maxQty < 1) return lines
    const existing = lines.find(l => l.key === entry.key)
    if (!existing) {
      if (lines.length >= MAX_ORDER_ITEMS) return lines
      return [...lines, {
        key: entry.key, kind: entry.kind, ids: entry.ids, title: entry.title,
        unitPrice: entry.price, quantity: 1, maxQty: entry.maxQty,
      }]
    }
    return lines.map(l => l.key === entry.key
      ? { ...l, quantity: Math.min(l.quantity + 1, l.maxQty) }
      : l)
  },

  changeQuantity: (lines: CartLine[], key: string, delta: number): CartLine[] =>
    lines
      .map(l => l.key === key ? { ...l, quantity: Math.min(l.quantity + delta, l.maxQty) } : l)
      .filter(l => l.quantity > 0),

  removeLine: (lines: CartLine[], key: string): CartLine[] => lines.filter(l => l.key !== key),

  cartTotal: (lines: CartLine[]): number =>
    lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0),

  cartCount: (lines: CartLine[]): number =>
    lines.reduce((sum, l) => sum + l.quantity, 0),

  // ── إرسال الطلب ─────────────────────────────────────────────────────────────
  validateForm: (form: OrderForm): string | null => {
    if (form.name.trim().length < 2) return 'اكتب اسمك'
    const digits = form.phone.replace(/\D/g, '')
    if (digits.length < 8 || digits.length > 15) return 'رقم الموبايل غير صحيح'
    return null
  },

  submitOrder: (form: OrderForm, lines: CartLine[]): Promise<CatalogOrderResult> => {
    const error = catalogService.validateForm(form)
    if (error) return Promise.reject(new Error(error))
    if (!lines.length) return Promise.reject(new Error('السلة فارغة'))

    const items = lines.flatMap((l): CatalogOrderItemInput[] =>
      l.kind === 'product'
        ? [{ kind: 'product', id: l.ids[0]!, quantity: l.quantity }]
        : l.ids.slice(0, l.quantity).map((id): CatalogOrderItemInput => ({ kind: 'device', id, quantity: 1 })),
    )

    return catalogRepository.createOrder({
      name:  form.name.trim(),
      phone: form.phone.trim(),
      notes: form.notes.trim() || null,
      items,
    })
  },
}
