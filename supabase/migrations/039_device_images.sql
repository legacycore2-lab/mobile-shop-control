-- 039: صورة خاصة بكل جهاز (تتقدم على صورة الموديل في الكتالوج العام)
alter table public.mobile_devices add column if not exists image_url   text;
alter table public.mobile_devices add column if not exists image_url_2 text;

create or replace view public.mobile_devices_view with (security_invoker = true) as
 SELECT d.id, d.imei1, d.imei2, d.serial_number, d.model_id, d.storage, d.color, d.condition,
    d.supplier_id, d.purchase_invoice_id, d.purchase_date, d.cost_price, d.selling_price,
    d.actual_selling_price, d.sold_to_customer_id, d.sale_invoice_id, d.sold_at,
    d.warranty_months, d.warranty_expires_at, d.status, d.location, d.notes, d.added_by,
    d.sold_by, d.created_at, d.updated_at, d.is_deleted,
    b.name AS brand_name, m.name AS model_name, s.name AS supplier_name,
    c.name AS customer_name, c.phone AS customer_phone,
    ap.full_name AS added_by_name, sp.full_name AS sold_by_name,
    d.old_price, d.battery_health, d.image_url, d.image_url_2
   FROM mobile_devices d
     JOIN mobile_models m ON m.id = d.model_id
     JOIN mobile_brands b ON b.id = m.brand_id
     JOIN suppliers s ON s.id = d.supplier_id
     LEFT JOIN customers c ON c.id = d.sold_to_customer_id
     LEFT JOIN profiles ap ON ap.id = d.added_by
     LEFT JOIN profiles sp ON sp.id = d.sold_by;

create or replace function public.get_public_catalog()
 returns jsonb
 language sql
 stable security definer
 set search_path to 'public'
as $function$
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
        'notes', nullif(left(btrim(d.notes), 300), ''),
        'image_url',   case when d.image_url is not null then d.image_url   else m.image_url   end,
        'image_url_2', case when d.image_url is not null then d.image_url_2 else m.image_url_2 end
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
$function$;
