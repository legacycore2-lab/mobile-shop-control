// src/lib/errors.ts
// ── Human-readable Arabic translations for common Supabase/Postgres errors ────
// Used by pages when surfacing a caught error to the user — raw Postgres/
// PostgREST error text (constraint names, SQLSTATE codes) is not meaningful
// to a non-technical user.

/** Extracts a message string from any thrown value — Error instance, a
 *  Supabase/PostgREST error object ({message, details, hint, code}), or
 *  anything else. */
export function extractErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  if (typeof err === 'object' && err !== null && 'message' in err) {
    const m = (err as { message: unknown }).message
    if (typeof m === 'string' && m) return m
  }
  return String(err)
}

/** Extracts a message, then translates known raw DB errors into Arabic. */
export function friendlyDbError(err: unknown): string {
  const raw = extractErrorMessage(err)

  if (raw.includes('mobile_devices_imei1_key') || raw.includes('mobile_devices_imei2_key')) {
    return 'رقم الـ IMEI ده مسجل بالفعل لجهاز آخر في النظام — تأكد من الرقم أو ابحث عن الجهاز في صفحة الأجهزة'
  }
  if (raw.includes('duplicate key value violates unique constraint')) {
    return 'البيانات دي مسجلة بالفعل في النظام'
  }
  if (raw.includes('violates foreign key constraint')) {
    return 'العنصر ده مرتبط ببيانات تانية ومينفعش يتحذف أو يتعدل بالشكل ده'
  }
  if (raw.includes('violates row-level security policy')) {
    return 'مفيش صلاحية كافية لتنفيذ العملية دي'
  }
  return raw || 'حدث خطأ غير متوقع'
}
