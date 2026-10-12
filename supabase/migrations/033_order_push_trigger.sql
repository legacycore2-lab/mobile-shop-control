-- 033: إشعار Web Push لحظي عند وصول طلب جديد (والتطبيق مقفول)
-- order_push_log: بيضمن إن كل طلب يتبعت عنه إشعار مرة واحدة بس

create table if not exists public.order_push_log (
  order_id   uuid        primary key references public.catalog_orders(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.order_push_log enable row level security;

create or replace function public.notify_new_catalog_order()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform net.http_post(
    url     := 'https://hgonjisrduahawrmglmd.supabase.co/functions/v1/send-order-push',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body    := jsonb_build_object('order_id', new.id)
  );
  return new;
end;
$$;

drop trigger if exists trg_notify_new_catalog_order on public.catalog_orders;
create trigger trg_notify_new_catalog_order
  after insert on public.catalog_orders
  for each row execute function public.notify_new_catalog_order();
