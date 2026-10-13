-- 034: صورة تانية لكل موديل (image_url_2) وإظهارها في الكتالوج العام
alter table public.mobile_models add column if not exists image_url_2 text;

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
        'installment_down_percent', s.installment_down_percent,
        'pay_cash', s.pay_cash,
        'pay_vodafone_cash', s.pay_vodafone_cash,
        'pay_instapay', s.pay_instapay)
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
        'image_url', m.image_url, 'image_url_2', m.image_url_2
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
