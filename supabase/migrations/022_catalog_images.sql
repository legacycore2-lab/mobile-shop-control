-- 022_catalog_images.sql
-- صور المنتجات والموديلات + عرضها في الكتالوج العام

alter table public.products      add column if not exists image_url text;
alter table public.mobile_models add column if not exists image_url text;

-- ── Storage bucket (قراءة عامة، رفع للمستخدمين المسجلين فقط) ─────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('catalog-images', 'catalog-images', true, 2097152,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = true,
      file_size_limit = 2097152,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists catalog_images_read   on storage.objects;
drop policy if exists catalog_images_insert on storage.objects;
drop policy if exists catalog_images_update on storage.objects;
drop policy if exists catalog_images_delete on storage.objects;

create policy catalog_images_read   on storage.objects
  for select using (bucket_id = 'catalog-images');
create policy catalog_images_insert on storage.objects
  for insert to authenticated with check (bucket_id = 'catalog-images');
create policy catalog_images_update on storage.objects
  for update to authenticated using (bucket_id = 'catalog-images');
create policy catalog_images_delete on storage.objects
  for delete to authenticated using (bucket_id = 'catalog-images');

-- ── الكتالوج العام: إضافة image_url ──────────────────────────────────────────

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
        'unit',          p.unit,
        'image_url',     p.image_url
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
        'warranty_months', d.warranty_months,
        'image_url',       m.image_url
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
