-- ══════════════════════════════════════════════════════════════════════════════
-- Migration 020: إشعار فوري عند نزول المخزون عن حد الطلب
-- ══════════════════════════════════════════════════════════════════════════════
-- أول ما منتج يعدّي حد الطلب، بينادي الدالة send-stock-push (quick-service) فورًا.
-- الفحص الدوري كل 5 دقايق (من 019) بيفضل شغال كاحتياطي.

create or replace function public.notify_low_stock_push()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_active and not new.is_deleted and new.stock_qty <= new.reorder_level
     and (tg_op = 'INSERT'
          or not old.is_active or old.is_deleted
          or old.stock_qty > old.reorder_level)
  then
    begin
      perform net.http_post(
        url     := 'https://hgonjisrduahawrmglmd.supabase.co/functions/v1/quick-service',
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body    := '{}'::jsonb
      );
    exception when others then
      null;
    end;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notify_low_stock_push on public.products;

create trigger trg_notify_low_stock_push
after insert or update of stock_qty, reorder_level, is_active, is_deleted
on public.products
for each row
execute function public.notify_low_stock_push();
