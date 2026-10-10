// supabase/functions/send-stock-push/index.ts
// بيتشغّل كل 5 دقايق (pg_cron) — يبعت Web Push للمنتجات اللي وصلت لحد الطلب.
// لازم يتنشر بدون Verify JWT.
import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

interface LowStockRow {
  product_id:    string
  product_name:  string
  stock_qty:     number
  reorder_level: number
  category_name: string
}

interface SubscriptionRow {
  id:       string
  endpoint: string
  p256dh:   string
  auth:     string
}

Deno.serve(async () => {
  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  webpush.setVapidDetails(
    Deno.env.get('VAPID_SUBJECT')!,
    Deno.env.get('VAPID_PUBLIC_KEY')!,
    Deno.env.get('VAPID_PRIVATE_KEY')!,
  )

  const { data: lowData, error: lowErr } = await admin.rpc('get_low_stock_products')
  if (lowErr) return new Response(lowErr.message, { status: 500 })
  const low = (lowData ?? []) as LowStockRow[]

  const { data: logData } = await admin.from('stock_push_log').select('product_id')
  const logged = new Set((logData ?? []).map((r: { product_id: string }) => r.product_id))
  const lowIds = new Set(low.map(r => r.product_id))

  // المنتجات اللي رجعت لمخزون طبيعي — نشيلها من السجل عشان تتنبه لو نزلت تاني
  const recovered = [...logged].filter(id => !lowIds.has(id))
  if (recovered.length) await admin.from('stock_push_log').delete().in('product_id', recovered)

  const fresh = low.filter(r => !logged.has(r.product_id))
  if (!fresh.length) return new Response(JSON.stringify({ sent: 0 }))

  const { data: subData } = await admin.from('push_subscriptions').select('id, endpoint, p256dh, auth')
  const subs = (subData ?? []) as SubscriptionRow[]
  if (!subs.length) return new Response(JSON.stringify({ sent: 0, reason: 'no subscriptions' }))

  const dead = new Set<string>()
  let sent = 0

  for (const item of fresh) {
    const out = item.stock_qty === 0
    const payload = JSON.stringify({
      title: out ? '⚠️ نفد المخزون' : '⚠️ مخزون منخفض',
      body:  out
        ? `${item.product_name} — نفد المخزون تماماً`
        : `${item.product_name} — متبقي ${item.stock_qty}`,
      tag:   `stock-${item.product_id}`,
      url:   'products',
    })

    for (const s of subs) {
      if (dead.has(s.id)) continue
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload)
        sent++
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode
        if (code === 404 || code === 410) dead.add(s.id)
      }
    }
  }

  if (dead.size) await admin.from('push_subscriptions').delete().in('id', [...dead])
  await admin.from('stock_push_log').upsert(fresh.map(r => ({ product_id: r.product_id })))

  return new Response(JSON.stringify({ sent }))
})
