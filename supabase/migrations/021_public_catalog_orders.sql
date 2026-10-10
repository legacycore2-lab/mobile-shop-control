-- ══════════════════════════════════════════════════════════════════════════════
-- Migration 021: كتالوج عام + طلبات العملاء
-- ══════════════════════════════════════════════════════════════════════════════
-- الزائر (بدون تسجيل دخول) بيشوف البضاعة المتاحة ويبعت طلب.
-- مفيش وصول مباشر للجداول للزوار — كله من خلال دالتين فقط:
--   get_public_catalog()   : عرض المنتجات والأجهزة (بدون سعر الشراء ولا IMEI)
--   create_catalog_order() : تسجيل طلب (الأسعار بتتحسب من قاعدة البيانات)

-- ── الجداول ──────────────────────────────────────────────────────────────────

create sequence if not exists public.catalog_order_seq start 1;

create table if not exists public.catalog_orders (
  id             uuid          primary key default gen_random_uuid(),
  order_number   text          not null unique,
  customer_name  text          not null,
  customer_phone text          not null,
  notes          text,
  status         text          not null default 'new'
                 check (status in ('new', 'confirmed', 'completed', 'cancelled')),
  total          numeric(12,2) not null default 0,
  handled_by     uuid          references public.profiles(id),
  created_at     timestamptz   not null default now(),
  updated_at     timestamptz   not null default now()
);

create table if not exists public.catalog_order_items (
  id         uuid          primary key default gen_random_uuid(),
  order_id   uuid          not null references public.catalog_orders(id) on delete cascade,
  item_type  text          not null check (item_type in ('product', 'device')),
  product_id uuid          references public.products(id) on delete set null,
  device_id  uuid          references public.mobile_devices(id) on delete set null,
  name       text          not null,
  unit_price numeric(12,2) not null,
  quantity   integer       not null check (quantity > 0)
);

create index if not exists catalog_order_items_order_idx on public.catalog_order_items(order_id);
create index if not exists catalog_orders_status_idx     on public.catalog_orders(status, created_at desc);

alter table public.catalog_orders      enable row level security;
alter table public.catalog_order_items enable row level security;

drop policy if exists catalog_orders_read   on public.catalog_orders;
drop policy if exists catalog_orders_update on public.catalog_orders;
drop policy if exists catalog_items_read    on public.catalog_order_items;

create policy catalog_orders_read   on public.catalog_orders
  for select to authenticated using (true);
create policy catalog_orders_update on public.catalog_orders
  for update to authenticated using (true) with check (true);
create policy catalog_items_read    on public.catalog_order_items
  for select to authenticated using (true);

-- ── عرض الكتالوج العام ───────────────────────────────────────────────────────

create or replace function public.get_public_catalog()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'products', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',            p.id,
        'name',          p.name,
        'category',      c.name,
        'product_type',  p.product_type,
        'selling_price', p.selling_price,
        'stock_qty',     p.stock_qty,
        'unit',          p.unit
      ) order by (p.stock_qty > 0) desc, p.name)
      from public.products p
      join public.product_categories c on c.id = p.category_id
      where p.is_active = true
        and p.is_deleted = false
        and p.selling_price > 0
    ), '[]'::jsonb),
    'devices', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',              d.id,
        'brand',           b.name,
        'model',           m.name,
        'storage',         d.storage,
        'color',           d.color,
        'condition',       d.condition,
        'selling_price',   d.selling_price,
        'battery_health',  d.battery_health,
        'warranty_months', d.warranty_months
      ) order by b.name, m.name, d.selling_price)
      from public.mobile_devices d
      join public.mobile_models m on m.id = d.model_id
      join public.mobile_brands b on b.id = m.brand_id
      where d.status = 'in_stock'
        and d.selling_price is not null
        and d.selling_price > 0
    ), '[]'::jsonb)
  );
$$;

-- ── تسجيل طلب ────────────────────────────────────────────────────────────────
-- p_items: [{ "kind": "product" | "device", "id": "<uuid>", "quantity": 2 }, ...]

create or replace function public.create_catalog_order(
  p_name  text,
  p_phone text,
  p_notes text,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name     text := btrim(coalesce(p_name, ''));
  v_phone    text := regexp_replace(coalesce(p_phone, ''), '[^0-9+]', '', 'g');
  v_order_id uuid;
  v_number   text;
  v_total    numeric(12,2) := 0;
  v_item     jsonb;
  v_qty      integer;
  v_prod     public.products%rowtype;
  v_dev      record;
begin
  if char_length(v_name) < 2 or char_length(v_name) > 80 then
    raise exception 'الاسم غير صحيح';
  end if;
  if char_length(v_phone) < 8 or char_length(v_phone) > 15 then
    raise exception 'رقم الموبايل غير صحيح';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 30 then
    raise exception 'الطلب فارغ';
  end if;

  -- حماية من الإزعاج: 5 طلبات في الساعة لنفس الرقم
  if (select count(*) from public.catalog_orders
      where customer_phone = v_phone and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'تم تجاوز عدد الطلبات المسموح، حاول لاحقًا';
  end if;

  v_number := 'ORD-' || lpad(nextval('public.catalog_order_seq')::text, 5, '0');

  insert into public.catalog_orders (order_number, customer_name, customer_phone, notes)
  values (v_number, v_name, v_phone, nullif(left(btrim(coalesce(p_notes, '')), 500), ''))
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := coalesce((v_item->>'quantity')::integer, 1);
    if v_qty < 1 or v_qty > 999 then
      raise exception 'الكمية غير صحيحة';
    end if;

    if v_item->>'kind' = 'product' then
      select * into v_prod from public.products
      where id = (v_item->>'id')::uuid
        and is_active = true and is_deleted = false and selling_price > 0;
      if not found then
        raise exception 'منتج غير متاح';
      end if;
      if v_prod.stock_qty < v_qty then
        raise exception 'الكمية المطلوبة من "%" غير متوفرة', v_prod.name;
      end if;
      insert into public.catalog_order_items (order_id, item_type, product_id, name, unit_price, quantity)
      values (v_order_id, 'product', v_prod.id, v_prod.name, v_prod.selling_price, v_qty);
      v_total := v_total + v_prod.selling_price * v_qty;

    elsif v_item->>'kind' = 'device' then
      select d.id, d.selling_price,
             b.name || ' ' || m.name
               || coalesce(' ' || d.storage, '')
               || coalesce(' ' || d.color, '') as label
      into v_dev
      from public.mobile_devices d
      join public.mobile_models m on m.id = d.model_id
      join public.mobile_brands b on b.id = m.brand_id
      where d.id = (v_item->>'id')::uuid
        and d.status = 'in_stock'
        and d.selling_price is not null and d.selling_price > 0;
      if not found then
        raise exception 'جهاز غير متاح';
      end if;
      insert into public.catalog_order_items (order_id, item_type, device_id, name, unit_price, quantity)
      values (v_order_id, 'device', v_dev.id, v_dev.label, v_dev.selling_price, 1);
      v_total := v_total + v_dev.selling_price;

    else
      raise exception 'نوع غير معروف';
    end if;
  end loop;

  update public.catalog_orders set total = v_total where id = v_order_id;

  return jsonb_build_object('id', v_order_id, 'order_number', v_number, 'total', v_total);
end;
$$;

revoke all on function public.get_public_catalog()                         from public;
revoke all on function public.create_catalog_order(text, text, text, jsonb) from public;
grant execute on function public.get_public_catalog()                         to anon, authenticated;
grant execute on function public.create_catalog_order(text, text, text, jsonb) to anon, authenticated;

-- ── صلاحيات صفحة الطلبات ─────────────────────────────────────────────────────

insert into public.role_permissions (role, resource, can_view, can_create, can_edit, can_delete)
select r.role, 'orders', r.v, false, r.e, false
from (values
  ('owner'::text,     true, true),
  ('manager'::text,   true, true),
  ('cashier'::text,   true, true),
  ('warehouse'::text, true, false)
) as r(role, v, e)
where not exists (
  select 1 from public.role_permissions rp
  where rp.role::text = r.role and rp.resource = 'orders'
);
