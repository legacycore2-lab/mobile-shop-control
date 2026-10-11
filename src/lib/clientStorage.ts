// src/lib/clientStorage.ts
// قراءة/كتابة آمنة (التخزين ممكن يكون ممنوع: وضع خاص، إلخ)

export function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export function writeJson(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch { /* ignore */ }
}

// معرّف جلسة عشوائي لتحليلات الزيارات (مش بيعرّف شخص)
export function getSessionId(): string {
  try {
    const existing = window.sessionStorage.getItem('catalog:session')
    if (existing) return existing
    const id = crypto.randomUUID()
    window.sessionStorage.setItem('catalog:session', id)
    return id
  } catch {
    return crypto.randomUUID()
  }
}
