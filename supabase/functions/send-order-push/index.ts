// supabase/functions/send-order-push/index.ts
// بيتنادى من trigger على catalog_orders عند كل طلب جديد — يبعت Web Push لحظي.
// لازم يتنشر بدون Verify JWT. كل طلب بيتبعت عنه مرة واحدة بس (order_push_log).
import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

interface SubscriptionRow {
  id:       string
  endpoint: string
  p256dh:   string
  auth:     string
}

const MAX_AGE_MS = 10 * 60 * 1000

Deno.serve(async (req) => {
  const { order_id } = await req.json().catch(() => ({})) as { order_id?: string }
  if (!order_id) return new Response('missing order_id', { status: 400 })

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { data: order } = await admin
    .from('catalog_orders')
    .select('id, order_number, customer_name, status, created_at')
    .eq('id', order_id)
    .maybeSingle()

  if (!order || order.status !== 'new' || Date.now() - new Date(order.created_at).getTime() > MAX_AGE_MS) {
    return new Response(JSON.stringify({ sent: 0, reason: 'not eligible' }))
  }

  // حجز الطلب: لو اتبعت قبل كده الإدراج بيفشل ونخرج
  const { error: claimErr } = await admin.from('order_push_log').insert({ order_id })
  if (claimErr) return new Response(JSON.stringify({ sent: 0, reason: 'already sent' }))

  webpush.setVapidDetails(
    Deno.env.get('VAPID_SUBJECT')!,
    Deno.env.get('VAPID_PUBLIC_KEY')!,
    Deno.env.get('VAPID_PRIVATE_KEY')!,
  )

  const { data: subData } = await admin.from('push_subscriptions').select('id, endpoint, p256dh, auth')
  const subs = (subData ?? []) as SubscriptionRow[]

  const payload = JSON.stringify({
    title: '🛒 طلب جديد',
    body:  `${order.order_number} — ${order.customer_name}`,
    tag:   `order-${order.id}`,
    url:   'orders',
  })

  const dead: string[] = []
  let sent = 0
  await Promise.all(subs.map(async s => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload)
      sent++
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode
      if (code === 404 || code === 410) dead.push(s.id)
    }
  }))

  if (dead.length) await admin.from('push_subscriptions').delete().in('id', dead)
  return new Response(JSON.stringify({ sent }))
})
