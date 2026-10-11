-- 023_store_info_and_visibility.sql
-- بيانات المحل (واتساب / عنوان / مواعيد) + التحكم في إظهار الأصناف في الكتالوج

create table if not exists public.store_info (
  id            integer primary key default 1 check (id = 1),
  whatsapp      text    not null default '',
  phone         text    not null default '',
  address       text    not null default '',
  working_hours text    not null default '',
  map_url       text    not null default '',
  updated_at    timestamptz not null default now()
);

insert into public.store_info (id) values (1) on conflict (id) do nothing;

alter table public.store_info enable row level security;
drop policy if exists store_info_read   on public.store_info;
drop policy if exists store_info_update on public.store_info;
create policy store_info_read   on public.store_info for select to authenticated using (true);
create policy store_info_update on public.store_info for update to authenticated using (true) with check (true);

alter table public.products      add column if not exists show_in_catalog boolean not null default true;
alter table public.mobile_models add column if not exists show_in_catalog boolean not null default true;

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
        'working_hours', s.working_hours, 'map_url', s.map_url)
      from public.store_info s where s.id = 1
    ),
    'products', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id, 'name', p.name, 'category', c.name,
        'product_type', p.product_type, 'selling_price', p.selling_price,
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
        'battery_health', d.battery_health, 'warranty_months', d.warranty_months,
        'image_url', m.image_url
      ) order by b.name, m.name, d.selling_price)
      from public.mobile_devices d
      join public.mobile_models m on m.id = d.model_id
      join public.mobile_brands b on b.id = m.brand_id
      where d.status = 'in_stock' and m.show_in_catalog = true
        and d.selling_price is not null and d.selling_price > 0
    ), '[]'::jsonb)
  );
$$;
