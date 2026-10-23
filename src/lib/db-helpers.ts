// src/lib/db-helpers.ts
// ── Shared DB utilities used across repositories ──────────────────────────────
// Rules:
//   • Pure data helpers only — no business logic
//   • No imports from pages / hooks / services
//   • Imported by repositories ONLY

import { supabase } from '@/lib/supabase'
import type { SaleInvoiceView, PurchaseInvoiceView } from '@/types/database'

// ── Number casting (Supabase numeric → JS number) ────────────────────────────

export function n(v: unknown): number {
  return Number(v ?? 0)
}

// ── Invoice view builders ─────────────────────────────────────────────────────
//
// IMPORTANT — discount model:
//   total_amount is stored AFTER discount has already been subtracted.
//   i.e.  total_amount = lines_total - discount
//   Therefore:  remaining = total_amount - paid_amount
//   Do NOT subtract discount again — that would double-count it.

function pickOne(v: unknown): Record<string, unknown> | null {
  const one = Array.isArray(v) ? v[0] : v
  return one && typeof one === 'object' ? one as Record<string, unknown> : null
}

// أسماء الأجهزة والمنتجات اللي في الفاتورة (للعرض في القائمة) — بيع وشراء
function invoiceItemNames(dev: unknown[], prd: unknown[]): string[] {
  const devices = dev.map(row => {
    const model = pickOne(pickOne((row as Record<string, unknown>)['mobile_devices'])?.['mobile_models'])
    const brand = pickOne(model?.['mobile_brands'])
    return [brand?.['name'], model?.['name']].filter(Boolean).join(' ')
  })
  const products = prd.map(row => {
    const r    = row as Record<string, unknown>
    const name = pickOne(r['products'])?.['name']
    const qty  = n(r['quantity'])
    return name ? (qty > 1 ? `${String(name)} ×${qty}` : String(name)) : ''
  })
  return [...devices, ...products].filter(Boolean)
}

export function buildSaleInvoiceView(r: Record<string, unknown>): SaleInvoiceView {
  const cust = r['customers']    as Record<string, unknown> | null
  const cby  = r['profiles']     as Record<string, unknown> | null
  const dev  = r['devices_agg']  as unknown[] | null
  const prd  = r['products_agg'] as unknown[] | null
  const total    = n(r['total_amount'])
  const paid     = n(r['paid_amount'])
  const discount = n(r['discount'])
  return {
    ...r,
    total_amount:    total,
    paid_amount:     paid,
    discount:        discount,
    remaining:       Math.max(0, total - paid),   // total_amount already net of discount
    customer_name:   (cust?.['name']  as string | null) ?? null,
    customer_phone:  (cust?.['phone'] as string | null) ?? null,
    created_by_name: String(cby?.['full_name'] ?? '—'),
    devices_count:   (dev  ?? []).length,
    products_count:  (prd  ?? []).length,
    item_names:      invoiceItemNames(dev ?? [], prd ?? []),
  } as SaleInvoiceView
}

export function buildPurchaseInvoiceView(r: Record<string, unknown>): PurchaseInvoiceView {
  const sup = r['suppliers']    as Record<string, unknown> | null
  const cby = r['profiles']     as Record<string, unknown> | null
  const dev = r['devices_agg']  as unknown[] | null
  const prd = r['products_agg'] as unknown[] | null
  const total    = n(r['total_amount'])
  const paid     = n(r['paid_amount'])
  const discount = n(r['discount'])
  return {
    ...r,
    total_amount:    total,
    paid_amount:     paid,
    discount:        discount,
    remaining:       Math.max(0, total - paid),   // total_amount already net of discount
    supplier_name:   String(sup?.['name']      ?? '—'),
    created_by_name: String(cby?.['full_name'] ?? '—'),
    devices_count:   (dev  ?? []).length,
    products_count:  (prd  ?? []).length,
    item_names:      invoiceItemNames(dev ?? [], prd ?? []),
  } as PurchaseInvoiceView
}

// ── Shared stock adjustment — used by both purchases & pos repositories ───────
// Fetches current qty then updates. Runs in parallel via Promise.all.
// Note: Supabase doesn't support arithmetic updates (stock_qty + delta) in JS client,
// so fetch+update is required. Each pair is atomic at the row level.

export async function adjustProductStock(
  lines: { product_id: string; qty_delta: number }[],
): Promise<void> {
  if (!lines.length) return
  await Promise.all(lines.map(async ({ product_id, qty_delta }) => {
    const { data: prod } = await supabase
      .from('products')
      .select('stock_qty')
      .eq('id', product_id)
      .single()
    if (!prod) return
    const current = n((prod as Record<string, unknown>)['stock_qty'])
    await supabase
      .from('products')
      .update({ stock_qty: Math.max(0, current + qty_delta) } as never)
      .eq('id', product_id)
  }))
}
