// src/lib/notifications.ts
// Browser Notifications + In-App alert state

const STORAGE_KEY = 'stock_notifications_enabled'
const NOTIFIED_KEY = 'stock_notified_ids' // عشان منبعتش تنبيه للنفس المنتج أكتر من مرة

// ── Permission ────────────────────────────────────────────────────────────────

export function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

export function notificationsEnabled(): boolean {
  return localStorage.getItem(STORAGE_KEY) === 'true'
}

export function setNotificationsEnabled(val: boolean): void {
  localStorage.setItem(STORAGE_KEY, val ? 'true' : 'false')
}

export async function requestPermission(): Promise<NotificationPermission> {
  if (!notificationsSupported()) return 'denied'
  if (Notification.permission === 'granted') return 'granted'
  return Notification.requestPermission()
}

export function getPermission(): NotificationPermission {
  if (!notificationsSupported()) return 'denied'
  return Notification.permission
}

// ── Send notification ─────────────────────────────────────────────────────────

export function sendNotification(title: string, body: string, tag?: string): void {
  if (!notificationsSupported()) return
  if (Notification.permission !== 'granted') return
  try {
    new Notification(title, {
      body,
      tag,
      icon:  '/mobile-shop-control/icon.png',
      badge: '/mobile-shop-control/icon.png',
      dir:   'rtl',
      lang:  'ar',
    })
  } catch { /* ignore */ }
}

// ── Already-notified set ──────────────────────────────────────────────────────

export function getNotifiedIds(): Set<string> {
  try {
    const raw = sessionStorage.getItem(NOTIFIED_KEY)
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set()
  } catch { return new Set() }
}

export function addNotifiedId(id: string): void {
  try {
    const set = getNotifiedIds()
    set.add(id)
    sessionStorage.setItem(NOTIFIED_KEY, JSON.stringify([...set]))
  } catch { /* ignore */ }
}

export function clearNotifiedIds(): void {
  sessionStorage.removeItem(NOTIFIED_KEY)
}
