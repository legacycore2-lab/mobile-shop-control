-- 024_catalog_growth.sql
-- تتبع الطلب • خصومات • تقييمات • تحليلات الكتالوج • تقسيط

-- ── خصومات: السعر قبل الخصم (للعرض فقط، السعر الفعلي هو selling_price) ───────
alter table public.products       add column if not exists old_price numeric(12,2);
alter table public.mobile_devices add column if not exists old_price numeric(12,2);

-- ── تقسيط: إعدادات المحل ────────────────────────────────────────────────────
alter table public.store_info add column if not exists installment_enabled          boolean       not null default false;
alter table public.store_info add column if not exists installment_interest_percent numeric(5,2)  not null default 0;
alter table public.store_info add column if not exists installment_down_percent     numeric(5,2)  not null default 0;

-- ── تقييمات ─────────────────────────────────────────────────────────────────
create table if not exists public.catalog_reviews (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null unique references public.catalog_orders(id) on delete cascade,
  customer_name text not null,
  rating        integer not null check (rating between 1 and 5),
  comment       text,
  status        text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at    timestamptz not null default now()
);

alter table public.catalog_reviews enable row level security;
drop policy if exists catalog_reviews_read   on public.catalog_reviews;
drop policy if exists catalog_reviews_update on public.catalog_reviews;
create policy catalog_reviews_read   on public.catalog_reviews for select to authenticated using (true);
create policy catalog_reviews_update on public.catalog_reviews for update to authenticated using (true) with check (true);

-- ── أحداث الكتالوج (زيارات / مشاهدات) ───────────────────────────────────────
create table if not exists public.catalog_events (
  id         bigint generated always as identity primary key,
  event_type text not null check (event_type in ('visit', 'view')),
  item_name  text,
  session_id text not null,
  created_at timestamptz not null default now()
);
create index if not exists catalog_events_created_idx on public.catalog_events(created_at desc);

alter table public.catalog_events enable row level security;
drop policy if exists catalog_events_read on public.catalog_events;
create policy catalog_events_read on public.catalog_events for select to authenticated using (true);

create or replace function public.log_catalog_event(p_type text, p_item text, p_session text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_type not in ('visit', 'view') or coalesce(char_length(p_session), 0) not between 8 and 64 then
    return;
  end if;
  -- حماية من الإغراق: 100 حدث في الساعة لكل جلسة
  if (select count(*) from public.catalog_events
      where session_id = p_session and created_at > now() - interval '1 hour') >= 100 then
    return;
  end if;
  insert into public.catalog_events (event_type, item_name, session_id)
  values (p_type, left(p_item, 120), p_session);
end;
$$;

-- ── تتبع الطلب (رقم الطلب + آخر 10 أرقام من الموبايل) ─────────────────────────
create or replace function public.track_catalog_order(p_number text, p_phone text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'order_number', o.order_number,
    'status',       o.status,
    'total',        o.total,
    'created_at',   o.created_at,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object('name', i.name, 'quantity', i.quantity))
      from public.catalog_order_items i where i.order_id = o.id
    ), '[]'::jsonb),
    'reviewed', exists (select 1 from public.catalog_reviews r where r.order_id = o.id)
  )
  from public.catalog_orders o
  where upper(o.order_number) = upper(btrim(p_number))
    and right(regexp_replace(o.customer_phone, '\D', '', 'g'), 10)
      = right(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), 10)
    and char_length(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g')) >= 8
  limit 1;
$$;

-- ── إرسال تقييم (لطلب اتسلّم فعلًا، مرة واحدة) ───────────────────────────────
create or replace function public.submit_catalog_review(
  p_number text, p_phone text, p_rating integer, p_comment text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.catalog_orders%rowtype;
begin
  if p_rating is null or p_rating < 1 or p_rating > 5 then
    raise exception 'التقييم غير صحيح';
  end if;

  select * into v_order from public.catalog_orders o
  where upper(o.order_number) = upper(btrim(p_number))
    and right(regexp_replace(o.customer_phone, '\D', '', 'g'), 10)
      = right(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), 10)
    and char_length(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g')) >= 8;
  if not found then
    raise exception 'بيانات الطلب غير صحيحة';
  end if;
  if v_order.status <> 'completed' then
    raise exception 'التقييم متاح بعد تسليم الطلب';
  end if;
  if exists (select 1 from public.catalog_reviews where order_id = v_order.id) then
    raise exception 'تم تقييم الطلب من قبل';
  end if;

  insert into public.catalog_reviews (order_id, customer_name, rating, comment)
  values (v_order.id, split_part(v_order.customer_name, ' ', 1), p_rating,
          nullif(left(btrim(coalesce(p_comment, '')), 400), ''));
end;
$$;

-- ── تقرير الكتالوج (للمستخدمين المسجلين فقط) ─────────────────────────────────
create or replace function public.get_catalog_report(p_days integer default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_since    timestamptz := now() - make_interval(days => greatest(1, least(coalesce(p_days, 30), 365)));
  v_visitors integer;
  v_orders   integer;
begin
  if auth.uid() is null then
    raise exception 'غير مصرح';
  end if;

  select count(distinct session_id) into v_visitors
  from public.catalog_events where event_type = 'visit' and created_at >= v_since;
  select count(*) into v_orders
  from public.catalog_orders where created_at >= v_since;

  return jsonb_build_object(
    'visitors', v_visitors,
    'orders',   v_orders,
    'top_viewed', coalesce((
      select jsonb_agg(t) from (
        select item_name as name, count(*)::integer as views
        from public.catalog_events
        where event_type = 'view' and created_at >= v_since and item_name is not null
        group by item_name order by count(*) desc limit 5
      ) t
    ), '[]'::jsonb)
  );
end;
$$;

-- ── الكتالوج العام: خصومات + تقييمات + إعدادات التقسيط ────────────────────────
create or replace function public.get_public_catalog()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'store', (
      select jsonb_build_object(
        'whatsapp', s.whatsapp, 'phone', s.phone, 'address', s.address,
        'working_hours', s.working_hours, 'map_url', s.map_url,
        'installment_enabled', s.installment_enabled,
        'installment_interest_percent', s.installment_interest_percent,
        'installment_down_percent', s.installment_down_percent)
      from public.store_info s where s.id = 1
    ),
    'products', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id, 'name', p.name, 'category', c.name,
        'product_type', p.product_type, 'selling_price', p.selling_price,
        'old_price', p.old_price,
        'stock_qty', p.stock_qty, 'unit', p.unit, 'image_url', p.image_url
      ) order by (p.stock_qty > 0) desc, p.name)
      from public.products p
      join public.product_categories c on c.id = p.category_id
      where p.is_active = true and p.is_deleted = false
        and p.show_in_catalog = true and p.selling_price > 0
    ), '[]'::jsonb),
    'devices', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', d.id, 'brand', b.name, 'model', m.name, 'storage', d.storage,
        'color', d.color, 'condition', d.condition, 'selling_price', d.selling_price,
        'old_price', d.old_price,
        'battery_health', d.battery_health, 'warranty_months', d.warranty_months,
        'image_url', m.image_url
      ) order by b.name, m.name, d.selling_price)
      from public.mobile_devices d
      join public.mobile_models m on m.id = d.model_id
      join public.mobile_brands b on b.id = m.brand_id
      where d.status = 'in_stock' and m.show_in_catalog = true
        and d.selling_price is not null and d.selling_price > 0
    ), '[]'::jsonb),
    'reviews', coalesce((
      select jsonb_agg(jsonb_build_object(
        'name', r.customer_name, 'rating', r.rating,
        'comment', r.comment, 'created_at', r.created_at
      ) order by r.created_at desc)
      from (
        select * from public.catalog_reviews
        where status = 'approved' order by created_at desc limit 12
      ) r
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.log_catalog_event(text, text, text)                 from public;
revoke all on function public.track_catalog_order(text, text)                     from public;
revoke all on function public.submit_catalog_review(text, text, integer, text)    from public;
revoke all on function public.get_catalog_report(integer)                         from public;
grant execute on function public.log_catalog_event(text, text, text)              to anon, authenticated;
grant execute on function public.track_catalog_order(text, text)                  to anon, authenticated;
grant execute on function public.submit_catalog_review(text, text, integer, text) to anon, authenticated;
grant execute on function public.get_catalog_report(integer)                      to authenticated;
