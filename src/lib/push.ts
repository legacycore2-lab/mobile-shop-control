// src/lib/push.ts
// Web Push — تعامل مباشر مع المتصفح فقط (Service Worker + PushManager)

const VAPID_PUBLIC_KEY =
  'BJdK0QvyaLK44ktxRjOdMUeED12pPfPo9s7bbQXSMRcxOX1lAjnt6K7pSbvDnrYrEDRvo76vRxS_xivO9TfZl1M'

export function pushSupported(): boolean {
  return typeof window !== 'undefined'
    && 'serviceWorker' in navigator
    && 'PushManager' in window
    && 'Notification' in window
}

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const raw     = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'))
  const out     = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

async function getRegistration(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration(import.meta.env.BASE_URL)
  if (existing) return existing
  await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL })
  return navigator.serviceWorker.ready
}

export async function getBrowserSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null
  const reg = await navigator.serviceWorker.getRegistration(import.meta.env.BASE_URL)
  return reg ? reg.pushManager.getSubscription() : null
}

export async function subscribeBrowser(): Promise<PushSubscription> {
  const reg = await getRegistration()
  const existing = await reg.pushManager.getSubscription()
  if (existing) return existing
  return reg.pushManager.subscribe({
    userVisibleOnly:      true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  })
}

export async function unsubscribeBrowser(): Promise<string | null> {
  const sub = await getBrowserSubscription()
  if (!sub) return null
  const endpoint = sub.endpoint
  await sub.unsubscribe()
  return endpoint
}
