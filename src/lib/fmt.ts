// src/lib/fmt.ts
// Safe number formatter — handles string|number input from Supabase numeric columns

/**
 * Formats a number with thousands separator.
 * Uses Western digits for maximum cross-browser/font compatibility.
 * Always treats null/undefined/NaN as 0.
 */
export function fmt(value: number | string | null | undefined): string {
  const num = Number(value ?? 0)
  const safe = isNaN(num) ? 0 : num
  return safe.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
}

/**
 * Format as currency with ج suffix
 */
export function fmtCurrency(value: number | string | null | undefined): string {
  return `${fmt(value)} ج`
}
