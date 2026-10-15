-- 032_random_stock_count.sql
-- الجرد العشوائي اليومي: المالك/المدير بيولّد جلسة جرد لمسئول (من جدول الموظفين)،
-- والمسئول بيفتح رابط خارجي من غير تسجيل دخول ويعلّم كل صنف صح أو غلط (مع العدد الصحيح).
-- (اتطبقت على Supabase بالفعل — الملف هنا للتوثيق فقط)

create table public.stock_count_sessions (
  id uuid primary key default gen_random_uuid(),
  count_date date not null default current_date,
  employee_id uuid not null references public.employees(id),
  access_token uuid not null unique default gen_random_uuid(),
  status text not null default 'pending' check (status in ('pending','submitted')),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  submitted_at timestamptz
);

create table public.stock_count_items (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.stock_count_sessions(id) on delete cascade,
  item_type text not null check (item_type in ('product','model')),
  product_id uuid references public.products(id),
  model_id uuid references public.mobile_models(id),
  item_name text not null,
  system_qty integer not null check (system_qty >= 0),
  is_correct boolean,
  counted_qty integer check (counted_qty >= 0),
  constraint stock_count_items_ref check (
    (item_type = 'product' and product_id is not null and model_id is null)
    or (item_type = 'model' and model_id is not null and product_id is null)
  ),
  constraint stock_count_items_answer check (
    is_correct is null
    or (is_correct = true and counted_qty is null)
    or (is_correct = false and counted_qty is not null and counted_qty <> system_qty)
  )
);

create index stock_count_items_session_idx on public.stock_count_items(session_id);
create index stock_count_sessions_date_idx on public.stock_count_sessions(count_date desc);

alter table public.stock_count_sessions enable row level security;
alter table public.stock_count_items enable row level security;

create policy stock_count_sessions_select on public.stock_count_sessions
  for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_active and p.role in ('owner','manager')));

create policy stock_count_items_select on public.stock_count_items
  for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_active and p.role in ('owner','manager')));

-- إنشاء جلسة جرد: اختيار عشوائي من المنتجات + موديلات الموبايل اللي ليها أجهزة في المخزن
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
  if p_products < 0 or p_models < 0 or p_products + p_models = 0 then
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

-- الشاشة الخارجية: قراءة الجلسة بالرابط (token)
create or replace function public.get_stock_count_by_token(p_token uuid)
returns jsonb
language sql
security definer
stable
set search_path = public
as $$
  select jsonb_build_object(
    'id', s.id,
    'count_date', s.count_date,
    'status', s.status,
    'employee_name', e.name,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', i.id,
        'item_type', i.item_type,
        'item_name', i.item_name,
        'system_qty', i.system_qty,
        'is_correct', i.is_correct,
        'counted_qty', i.counted_qty
      ) order by i.item_type, i.item_name)
      from stock_count_items i where i.session_id = s.id
    ), '[]'::jsonb)
  )
  from stock_count_sessions s
  join employees e on e.id = s.employee_id
  where s.access_token = p_token;
$$;

-- الشاشة الخارجية: إرسال النتيجة (مرة واحدة فقط، لازم كل الأصناف تتجاوب)
create or replace function public.submit_stock_count(p_token uuid, p_answers jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session stock_count_sessions;
  v_total integer;
  v_answered integer;
begin
  select * into v_session from stock_count_sessions where access_token = p_token for update;
  if not found then
    raise exception 'الرابط غير صحيح';
  end if;
  if v_session.status = 'submitted' then
    raise exception 'تم إرسال الجرد مسبقاً';
  end if;

  update stock_count_items i
  set is_correct = a.is_correct,
      counted_qty = case when a.is_correct then null else a.counted_qty end
  from jsonb_to_recordset(p_answers) as a(item_id uuid, is_correct boolean, counted_qty integer)
  where i.id = a.item_id and i.session_id = v_session.id;

  select count(*), count(is_correct) into v_total, v_answered
  from stock_count_items where session_id = v_session.id;

  if v_answered <> v_total then
    raise exception 'لازم تجاوب على كل الأصناف';
  end if;

  update stock_count_sessions set status = 'submitted', submitted_at = now() where id = v_session.id;
end;
$$;

revoke all on function public.create_stock_count(uuid, integer, integer) from public, anon;
revoke all on function public.get_stock_count_by_token(uuid) from public;
revoke all on function public.submit_stock_count(uuid, jsonb) from public;
grant execute on function public.create_stock_count(uuid, integer, integer) to authenticated;
grant execute on function public.get_stock_count_by_token(uuid) to anon, authenticated;
grant execute on function public.submit_stock_count(uuid, jsonb) to anon, authenticated;
