// src/services/catalog.service.ts
import { catalogRepository } from '@/repositories/catalog.repository'
import { CONDITION_MAP } from '@/constants/statusMaps'
import type { PublicCatalog, CatalogOrderItemInput, CatalogOrderResult, TrackedOrder, StoreInfo } from '@/types/database'

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
  note:     string | null     // ملاحظة الجهاز (الموبايلات فقط)
  condition: string | null    // new | used | refurbished (الموبايلات فقط)
  price:    number
  oldPrice: number | null     // السعر قبل الخصم (null = مفيش عرض)
  maxQty:   number            // 0 = نفد
  image:    string | null
  image2:   string | null     // صورة تانية (الموبايلات فقط)
  specs:    { label: string; value: string }[]   // للمقارنة (الموبايلات فقط)
}

export type CatalogSort = 'default' | 'price-asc' | 'price-desc'

export const SORT_OPTIONS: { id: CatalogSort; label: string }[] = [
  { id: 'default',    label: 'الترتيب الافتراضي' },
  { id: 'price-asc',  label: 'الأرخص أولاً'      },
  { id: 'price-desc', label: 'الأغلى أولاً'      },
]

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

  // العرض بيظهر بس لو السعر القديم أكبر من الحالي
  validOldPrice: (price: number, old: number | null): number | null =>
    old !== null && old > price ? old : null,

  discountPercent: (price: number, old: number): number =>
    Math.round(((old - price) / old) * 100),

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
      note:     null,
      condition: null,
      price:    p.selling_price,
      oldPrice: catalogService.validOldPrice(p.selling_price, p.old_price),
      maxQty:   Math.max(p.stock_qty, 0),
      image:    p.image_url,
      image2:   null,
      specs:    [],
    }))

    const grouped = new Map<string, CatalogEntry>()
    for (const d of catalog.devices) {
      const note = d.notes?.trim() || null
      const key = ['d', d.brand, d.model, d.storage, d.color, d.condition, d.selling_price, d.old_price, d.battery_health, d.warranty_months, note].join('|')
      const existing = grouped.get(key)
      if (existing) {
        existing.ids.push(d.id)
        existing.maxQty = existing.ids.length
        continue
      }
      const specs: CatalogEntry['specs'] = [
        { label: 'الحالة',  value: CONDITION_MAP[d.condition] ?? d.condition },
        { label: 'السعة',   value: d.storage ?? '—' },
        { label: 'اللون',   value: d.color ?? '—' },
        { label: 'البطارية', value: d.battery_health ? `${d.battery_health}%` : '—' },
        { label: 'الضمان',  value: d.warranty_months > 0 ? `${d.warranty_months} شهر` : 'بدون' },
      ]
      const details: string[] = []
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
        note,
        condition: d.condition,
        price:    d.selling_price,
        oldPrice: catalogService.validOldPrice(d.selling_price, d.old_price),
        maxQty:   1,
        image:    d.image_url,
        image2:   d.image_url_2 ?? null,
        specs,
      })
    }

    return [...grouped.values(), ...products]
  },

  // ── فلتر السعر (القيم نصوص من حقول الإدخال، الفاضي = بدون حد) ───────────────
  inPriceRange: (entry: CatalogEntry, min: string, max: string): boolean => {
    if (min && entry.price < Number(min)) return false
    if (max && entry.price > Number(max)) return false
    return true
  },

  // ── الترتيب (المتاح قبل النافد دايمًا) ──────────────────────────────────────
  sort: (entries: CatalogEntry[], mode: CatalogSort): CatalogEntry[] => {
    if (mode === 'default') return entries
    const dir = mode === 'price-asc' ? 1 : -1
    return [...entries].sort((a, b) =>
      Number(a.maxQty < 1) - Number(b.maxQty < 1) || (a.price - b.price) * dir)
  },

  // ── مشاركة صنف (نص + رابط الكتالوج مفتوح على الصنف) ─────────────────────────
  shareText: (entry: CatalogEntry, baseUrl: string): string =>
    `${entry.title} — ${entry.price.toLocaleString('en-US')} ج\n${baseUrl}?q=${encodeURIComponent(entry.title)}`,

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

// ── تتبع الطلب والتقييم ───────────────────────────────────────────────────────

export const trackingService = {
  track: async (number: string, phone: string): Promise<TrackedOrder> => {
    if (!number.trim()) throw new Error('اكتب رقم الطلب')
    if (phone.replace(/\D/g, '').length < 8) throw new Error('اكتب رقم الموبايل اللي طلبت بيه')
    const order = await catalogRepository.trackOrder(number.trim(), phone)
    if (!order) throw new Error('مفيش طلب بالبيانات دي، راجع الرقم')
    return order
  },

  review: async (number: string, phone: string, rating: number, comment: string): Promise<void> => {
    if (rating < 1 || rating > 5) throw new Error('اختار تقييم من 1 إلى 5')
    return catalogRepository.submitReview(number, phone, rating, comment.trim() || null)
  },

  logEvent: (type: 'visit' | 'view', item: string | null, session: string): Promise<void> =>
    catalogRepository.logEvent(type, item, session),
}

// ── التقسيط (فايدة سنوية بسيطة على المبلغ المتبقي بعد المقدم) ───────────────────

export const INSTALLMENT_MONTHS = [6, 12, 18, 24] as const

export interface InstallmentPlan { down: number; monthly: number; total: number }

export function installmentPlan(price: number, months: number, store: StoreInfo): InstallmentPlan {
  const down      = Math.round(price * store.installment_down_percent / 100)
  const financed  = price - down
  const interest  = financed * (store.installment_interest_percent / 100) * (months / 12)
  const monthly   = Math.ceil((financed + interest) / months)
  return { down, monthly, total: down + monthly * months }
}

// أقل قسط شهري متاح (أطول مدة) — للعرض على كارت الموبايل. null = التقسيط مش متاح للصنف
export function installmentFrom(entry: CatalogEntry, store: StoreInfo | null): number | null {
  if (!store?.installment_enabled || entry.kind !== 'device' || entry.maxQty < 1) return null
  const longest = INSTALLMENT_MONTHS[INSTALLMENT_MONTHS.length - 1]
  return installmentPlan(entry.price, longest, store).monthly
}
