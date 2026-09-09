// src/lib/validate.ts
// ── Shared validation helpers ──────────────────────────────────────────────────
// Usage: const err = validate.required(value, 'الاسم') ?? validate.minLength(value, 3, 'الاسم')
//        if (err) return setError(err)

export const validate = {

  /** Field must be non-empty string */
  required(value: string | null | undefined, label: string): string | null {
    if (!value || !String(value).trim()) return `${label} مطلوب`
    return null
  },

  /** Field must be a positive number */
  positive(value: string | number | null | undefined, label: string): string | null {
    const n = Number(value)
    if (isNaN(n) || n <= 0) return `${label} يجب أن يكون رقماً موجباً`
    return null
  },

  /** Field must be >= 0 */
  nonNegative(value: string | number | null | undefined, label: string): string | null {
    const n = Number(value)
    if (isNaN(n) || n < 0) return `${label} يجب أن يكون صفراً أو أكثر`
    return null
  },

  /** IMEI: 15 digits */
  imei(value: string | null | undefined): string | null {
    if (!value || !value.trim()) return 'IMEI مطلوب'
    const clean = value.trim()
    if (!/^\d{14,15}$/.test(clean)) return 'IMEI يجب أن يكون 14-15 رقماً'
    return null
  },

  /** Phone: Egyptian format */
  phone(value: string | null | undefined): string | null {
    if (!value || !value.trim()) return null // optional
    const clean = value.trim().replace(/\s/g, '')
    if (!/^01[0-2,5]\d{8}$/.test(clean)) return 'رقم الهاتف غير صحيح (مثال: 01012345678)'
    return null
  },

  /** Email format */
  email(value: string | null | undefined): string | null {
    if (!value || !value.trim()) return null // optional
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) return 'البريد الإلكتروني غير صحيح'
    return null
  },

  /** Date string YYYY-MM-DD */
  date(value: string | null | undefined, label = 'التاريخ'): string | null {
    if (!value) return `${label} مطلوب`
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return `${label} غير صحيح`
    return null
  },

  /** Run multiple validators, return first error */
  first(...errors: (string | null)[]): string | null {
    return errors.find(e => e !== null) ?? null
  },
}
