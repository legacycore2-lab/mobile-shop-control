-- 033_stock_count_all_items.sql
-- الجرد الشامل: لو p_products أو p_models = NULL يتم جرد كل الأصناف من النوع ده
-- (اتطبقت على Supabase بالفعل — الملف هنا للتوثيق فقط)

create or replace function public.create_stock_count(p_employee_id uuid, p_products integer default 5, p_models integer default 3)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role user_role;
  v_session uuid;
begin
  select role into v_role from profiles where id = auth.uid() and is_active;
  if v_role is null or v_role not in ('owner','manager') then
    raise exception 'غير مسموح';
  end if;
  if not exists (select 1 from employees where id = p_employee_id and is_active) then
    raise exception 'المسئول غير موجود';
  end if;
  -- NULL = كل الأصناف
  if coalesce(p_products, 0) < 0 or coalesce(p_models, 0) < 0 or (p_products = 0 and p_models = 0) then
    raise exception 'عدد الأصناف غير صحيح';
  end if;

  insert into stock_count_sessions (employee_id, created_by)
  values (p_employee_id, auth.uid())
  returning id into v_session;

  insert into stock_count_items (session_id, item_type, product_id, item_name, system_qty)
  select v_session, 'product', p.id, p.name, p.stock_qty
  from products p
  where p.is_active and not p.is_deleted
  order by random()
  limit p_products;

  insert into stock_count_items (session_id, item_type, model_id, item_name, system_qty)
  select v_session, 'model', m.id, b.name || ' ' || m.name, count(d.id)::int
  from mobile_models m
  join mobile_brands b on b.id = m.brand_id
  join mobile_devices d on d.model_id = m.id and d.status = 'in_stock' and not d.is_deleted
  group by m.id, b.name, m.name
  order by random()
  limit p_models;

  return v_session;
end;
$$;
