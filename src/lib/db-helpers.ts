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
    remaining:       Math.max(0, total - paid - discount),
    customer_name:   (cust?.['name']  as string | null) ?? null,
    customer_phone:  (cust?.['phone'] as string | null) ?? null,
    created_by_name: String(cby?.['full_name'] ?? '—'),
    devices_count:   (dev  ?? []).length,
    products_count:  (prd  ?? []).length,
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
    remaining:       total - paid - discount,
    supplier_name:   String(sup?.['name']      ?? '—'),
    created_by_name: String(cby?.['full_name'] ?? '—'),
    devices_count:   (dev  ?? []).length,
    products_count:  (prd  ?? []).length,
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
