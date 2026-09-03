// src/lib/fmt.ts
// Safe Arabic number formatter — handles string|number input from Supabase numeric columns

/**
 * Formats a number (or numeric string) as Arabic-locale with thousands separator.
 * Falls back to Western digits if ar-EG locale is unavailable.
 * Always treats null/undefined/NaN as 0.
 */
export function fmt(value: number | string | null | undefined): string {
  const num = Number(value ?? 0)
  const safe = isNaN(num) ? 0 : num
  try {
    return safe.toLocaleString('ar-EG', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })
  } catch {
    return safe.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })
  }
}

/**
 * Format as currency with ج suffix
 */
export function fmtCurrency(value: number | string | null | undefined): string {
  return `${fmt(value)} ج`
}
