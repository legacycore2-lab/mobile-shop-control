-- ══════════════════════════════════════════════════════════════════════════════
-- Migration 019: إشعارات Web Push (تعمل والتطبيق مقفول)
-- ══════════════════════════════════════════════════════════════════════════════
-- push_subscriptions : اشتراك كل جهاز في الإشعارات
-- stock_push_log     : المنتجات اللي اتبعت عنها إشعار (عشان ما يتكررش)
-- جدولة: كل 5 دقايق بيشغّل الدالة send-stock-push (Edge Function)

create table if not exists public.push_subscriptions (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references public.profiles(id) on delete cascade,
  endpoint   text        not null unique,
  p256dh     text        not null,
  auth       text        not null,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

drop policy if exists push_subscriptions_authenticated on public.push_subscriptions;
create policy push_subscriptions_authenticated on public.push_subscriptions
  for all to authenticated
  using (true)
  with check (auth.uid() = user_id);

create table if not exists public.stock_push_log (
  product_id  uuid        primary key references public.products(id) on delete cascade,
  notified_at timestamptz not null default now()
);

alter table public.stock_push_log enable row level security;

create extension if not exists pg_net;
create extension if not exists pg_cron;

select cron.unschedule('send-stock-push')
where exists (select 1 from cron.job where jobname = 'send-stock-push');

select cron.schedule(
  'send-stock-push',
  '*/5 * * * *',
  $$
  select net.http_post(
    url     := 'https://hgonjisrduahawrmglmd.supabase.co/functions/v1/send-stock-push',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body    := '{}'::jsonb
  );
  $$
);
