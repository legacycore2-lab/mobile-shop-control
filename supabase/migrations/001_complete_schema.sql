-- ============================================================
-- Mobile Shop Control — Complete Database Schema
-- Project: hgonjisrduahawrmglmd
-- Run once in Supabase SQL Editor
-- ============================================================

-- ── Extensions ───────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ============================================================
-- PHASE 1: Core Tables (profiles, suppliers, customers,
--          products, devices)
-- ============================================================

-- ── Profiles (extends auth.users) ────────────────────────────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text        not null default '',
  phone       text,
  role        text        not null default 'cashier'
                check (role in ('owner','manager','cashier','warehouse')),
  is_active   boolean     not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ── Suppliers ────────────────────────────────────────────────────────────────
create table if not exists public.suppliers (
  id              uuid        primary key default uuid_generate_v4(),
  name            text        not null,
  phone           text,
  address         text,
  notes           text,
  opening_balance numeric(12,2) not null default 0,
  is_active       boolean     not null default true,
  created_by      uuid        references public.profiles(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ── Customers ────────────────────────────────────────────────────────────────
create table if not exists public.customers (
  id              uuid        primary key default uuid_generate_v4(),
  name            text        not null,
  phone           text,
  national_id     text,
  address         text,
  notes           text,
  opening_balance numeric(12,2) not null default 0,
  is_active       boolean     not null default true,
  created_by      uuid        references public.profiles(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ── Product Categories ───────────────────────────────────────────────────────
create table if not exists public.product_categories (
  id         uuid        primary key default uuid_generate_v4(),
  name       text        not null,
  type       text        not null default 'accessory'
               check (type in ('accessory','spare_part')),
  created_at timestamptz not null default now()
);

-- ── Products ─────────────────────────────────────────────────────────────────
create table if not exists public.products (
  id                  uuid        primary key default uuid_generate_v4(),
  category_id         uuid        not null references public.product_categories(id),
  name                text        not null,
  sku                 text,
  barcode             text,
  product_type        text        not null default 'accessory'
                        check (product_type in ('accessory','spare_part')),
  compatible_models   text[],
  cost_price          numeric(12,2) not null default 0,
  selling_price       numeric(12,2) not null default 0,
  stock_qty           integer     not null default 0,
  reorder_level       integer     not null default 5,
  unit                text        not null default 'قطعة',
  default_supplier_id uuid        references public.suppliers(id),
  is_active           boolean     not null default true,
  notes               text,
  created_by          uuid        references public.profiles(id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ── Mobile Brands ────────────────────────────────────────────────────────────
create table if not exists public.mobile_brands (
  id         uuid        primary key default uuid_generate_v4(),
  name       text        not null unique,
  created_at timestamptz not null default now()
);

-- ── Mobile Models ────────────────────────────────────────────────────────────
create table if not exists public.mobile_models (
  id         uuid        primary key default uuid_generate_v4(),
  brand_id   uuid        not null references public.mobile_brands(id) on delete cascade,
  name       text        not null,
  created_at timestamptz not null default now()
);

-- ── Mobile Devices ───────────────────────────────────────────────────────────
create table if not exists public.mobile_devices (
  id                   uuid        primary key default uuid_generate_v4(),
  imei1                text        not null unique,
  imei2                text,
  serial_number        text,
  model_id             uuid        not null references public.mobile_models(id),
  storage              text,
  color                text,
  condition            text        not null default 'new'
                         check (condition in ('new','used','refurbished')),
  supplier_id          uuid        not null references public.suppliers(id),
  purchase_invoice_id  uuid,  -- FK added after invoice table created
  purchase_date        date        not null default current_date,
  cost_price           numeric(12,2) not null default 0,
  selling_price        numeric(12,2),
  actual_selling_price numeric(12,2),
  sold_to_customer_id  uuid        references public.customers(id),
  sale_invoice_id      uuid,  -- FK added after invoice table created
  sold_at              timestamptz,
  warranty_months      integer     not null default 12,
  warranty_expires_at  timestamptz,
  status               text        not null default 'in_stock'
                         check (status in ('in_stock','sold','returned','defective','sent_to_repair')),
  location             text,
  notes                text,
  added_by             uuid        references public.profiles(id),
  sold_by              uuid        references public.profiles(id),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- ── Audit Logs ───────────────────────────────────────────────────────────────
create table if not exists public.audit_logs (
  id          uuid        primary key default uuid_generate_v4(),
  user_id     uuid        references public.profiles(id),
  action      text        not null,
  table_name  text,
  record_id   uuid,
  old_data    jsonb,
  new_data    jsonb,
  ip_address  text,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- PHASE 2: Invoice Tables
-- ============================================================

-- ── Purchase Invoices ────────────────────────────────────────────────────────
create table if not exists public.purchase_invoices (
  id             uuid        primary key default uuid_generate_v4(),
  invoice_number text        not null unique,
  supplier_id    uuid        not null references public.suppliers(id),
  invoice_date   date        not null default current_date,
  total_amount   numeric(12,2) not null default 0,
  paid_amount    numeric(12,2) not null default 0,
  discount       numeric(12,2) not null default 0,
  notes          text,
  status         text        not null default 'draft'
                   check (status in ('draft','confirmed','cancelled')),
  created_by     uuid        references public.profiles(id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ── Purchase Invoice — Device Lines ──────────────────────────────────────────
create table if not exists public.purchase_invoice_devices (
  id         uuid        primary key default uuid_generate_v4(),
  invoice_id uuid        not null references public.purchase_invoices(id) on delete cascade,
  device_id  uuid        not null references public.mobile_devices(id) on delete restrict,
  cost_price numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

-- ── Purchase Invoice — Product Lines ─────────────────────────────────────────
create table if not exists public.purchase_invoice_products (
  id         uuid        primary key default uuid_generate_v4(),
  invoice_id uuid        not null references public.purchase_invoices(id) on delete cascade,
  product_id uuid        not null references public.products(id) on delete restrict,
  quantity   integer     not null default 1 check (quantity > 0),
  unit_price numeric(12,2) not null default 0,
  subtotal   numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

-- ── Sale Invoices ────────────────────────────────────────────────────────────
create table if not exists public.sale_invoices (
  id             uuid        primary key default uuid_generate_v4(),
  invoice_number text        not null unique,
  customer_id    uuid        references public.customers(id),
  invoice_date   date        not null default current_date,
  total_amount   numeric(12,2) not null default 0,
  paid_amount    numeric(12,2) not null default 0,
  discount       numeric(12,2) not null default 0,
  notes          text,
  status         text        not null default 'draft'
                   check (status in ('draft','confirmed','cancelled')),
  created_by     uuid        references public.profiles(id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ── Sale Invoice — Device Lines ───────────────────────────────────────────────
create table if not exists public.sale_invoice_devices (
  id                   uuid        primary key default uuid_generate_v4(),
  invoice_id           uuid        not null references public.sale_invoices(id) on delete cascade,
  device_id            uuid        not null references public.mobile_devices(id) on delete restrict,
  actual_selling_price numeric(12,2) not null default 0,
  created_at           timestamptz not null default now()
);

-- ── Sale Invoice — Product Lines ──────────────────────────────────────────────
create table if not exists public.sale_invoice_products (
  id         uuid        primary key default uuid_generate_v4(),
  invoice_id uuid        not null references public.sale_invoices(id) on delete cascade,
  product_id uuid        not null references public.products(id) on delete restrict,
  quantity   integer     not null default 1 check (quantity > 0),
  unit_price numeric(12,2) not null default 0,
  subtotal   numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

-- ── Now add deferred FKs on mobile_devices ───────────────────────────────────
do $$ begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'mobile_devices_purchase_invoice_id_fkey'
  ) then
    alter table public.mobile_devices
      add constraint mobile_devices_purchase_invoice_id_fkey
      foreign key (purchase_invoice_id) references public.purchase_invoices(id);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'mobile_devices_sale_invoice_id_fkey'
  ) then
    alter table public.mobile_devices
      add constraint mobile_devices_sale_invoice_id_fkey
      foreign key (sale_invoice_id) references public.sale_invoices(id);
  end if;
end $$;

-- ============================================================
-- PHASE 3: Indexes
-- ============================================================

create index if not exists idx_products_category      on public.products(category_id);
create index if not exists idx_products_type          on public.products(product_type);
create index if not exists idx_products_active        on public.products(is_active);
create index if not exists idx_products_stock         on public.products(stock_qty);

create index if not exists idx_mobile_devices_imei1   on public.mobile_devices(imei1);
create index if not exists idx_mobile_devices_status  on public.mobile_devices(status);
create index if not exists idx_mobile_devices_model   on public.mobile_devices(model_id);
create index if not exists idx_mobile_devices_supplier on public.mobile_devices(supplier_id);

create index if not exists idx_mobile_models_brand    on public.mobile_models(brand_id);

create index if not exists idx_purchase_inv_supplier  on public.purchase_invoices(supplier_id);
create index if not exists idx_purchase_inv_status    on public.purchase_invoices(status);
create index if not exists idx_purchase_inv_date      on public.purchase_invoices(invoice_date);
create index if not exists idx_pid_invoice            on public.purchase_invoice_devices(invoice_id);
create index if not exists idx_pip_invoice            on public.purchase_invoice_products(invoice_id);

create index if not exists idx_sale_inv_customer      on public.sale_invoices(customer_id);
create index if not exists idx_sale_inv_status        on public.sale_invoices(status);
create index if not exists idx_sale_inv_date          on public.sale_invoices(invoice_date);
create index if not exists idx_sid_invoice            on public.sale_invoice_devices(invoice_id);
create index if not exists idx_sip_invoice            on public.sale_invoice_products(invoice_id);

create index if not exists idx_audit_logs_user        on public.audit_logs(user_id);
create index if not exists idx_audit_logs_table       on public.audit_logs(table_name);
create index if not exists idx_audit_logs_created     on public.audit_logs(created_at desc);

-- ============================================================
-- PHASE 4: Updated_at Triggers
-- ============================================================

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_profiles_updated_at') then
    create trigger trg_profiles_updated_at
      before update on public.profiles
      for each row execute function public.set_updated_at();
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_suppliers_updated_at') then
    create trigger trg_suppliers_updated_at
      before update on public.suppliers
      for each row execute function public.set_updated_at();
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_customers_updated_at') then
    create trigger trg_customers_updated_at
      before update on public.customers
      for each row execute function public.set_updated_at();
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_products_updated_at') then
    create trigger trg_products_updated_at
      before update on public.products
      for each row execute function public.set_updated_at();
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_mobile_devices_updated_at') then
    create trigger trg_mobile_devices_updated_at
      before update on public.mobile_devices
      for each row execute function public.set_updated_at();
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_purchase_invoices_updated_at') then
    create trigger trg_purchase_invoices_updated_at
      before update on public.purchase_invoices
      for each row execute function public.set_updated_at();
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_sale_invoices_updated_at') then
    create trigger trg_sale_invoices_updated_at
      before update on public.sale_invoices
      for each row execute function public.set_updated_at();
  end if;
end $$;

-- ============================================================
-- PHASE 5: RPC Functions
-- ============================================================

-- ── Auto-create profile on signup ────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'cashier')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Lookup device by IMEI ─────────────────────────────────────────────────────
create or replace function public.lookup_device_by_imei(p_imei text)
returns setof public.mobile_devices_view
language sql stable as $$
  select * from public.mobile_devices_view
  where imei1 = p_imei or imei2 = p_imei
  limit 5;
$$;

-- ── Low stock products ────────────────────────────────────────────────────────
create or replace function public.get_low_stock_products()
returns table (
  product_id    uuid,
  product_name  text,
  stock_qty     integer,
  reorder_level integer,
  category_name text
)
language sql stable as $$
  select
    p.id,
    p.name,
    p.stock_qty,
    p.reorder_level,
    c.name
  from public.products p
  join public.product_categories c on c.id = p.category_id
  where p.is_active = true
    and p.stock_qty <= p.reorder_level
  order by p.stock_qty asc;
$$;

-- ── Next purchase invoice number ──────────────────────────────────────────────
create or replace function public.next_purchase_invoice_number()
returns text language plpgsql as $$
declare
  v_count integer;
  v_num   text;
begin
  select count(*) + 1 into v_count from public.purchase_invoices;
  v_num := 'PUR-' || lpad(v_count::text, 5, '0');
  -- ensure uniqueness
  while exists (select 1 from public.purchase_invoices where invoice_number = v_num) loop
    v_count := v_count + 1;
    v_num := 'PUR-' || lpad(v_count::text, 5, '0');
  end loop;
  return v_num;
end;
$$;

-- ── Next sale invoice number ──────────────────────────────────────────────────
create or replace function public.next_sale_invoice_number()
returns text language plpgsql as $$
declare
  v_count integer;
  v_num   text;
begin
  select count(*) + 1 into v_count from public.sale_invoices;
  v_num := 'SAL-' || lpad(v_count::text, 5, '0');
  while exists (select 1 from public.sale_invoices where invoice_number = v_num) loop
    v_count := v_count + 1;
    v_num := 'SAL-' || lpad(v_count::text, 5, '0');
  end loop;
  return v_num;
end;
$$;

-- ── Log action ────────────────────────────────────────────────────────────────
create or replace function public.log_action(
  p_user_id   uuid,
  p_action    text,
  p_table     text    default null,
  p_record_id uuid    default null,
  p_old_data  jsonb   default null,
  p_new_data  jsonb   default null
)
returns void language plpgsql security definer as $$
begin
  insert into public.audit_logs (user_id, action, table_name, record_id, old_data, new_data)
  values (p_user_id, p_action, p_table, p_record_id, p_old_data, p_new_data);
end;
$$;

-- ============================================================
-- PHASE 6: View — mobile_devices_view
-- ============================================================

create or replace view public.mobile_devices_view as
select
  d.*,
  b.name  as brand_name,
  m.name  as model_name,
  s.name  as supplier_name,
  c.name  as customer_name,
  c.phone as customer_phone,
  ap.full_name as added_by_name,
  sp.full_name as sold_by_name
from public.mobile_devices d
join  public.mobile_models   m  on m.id = d.model_id
join  public.mobile_brands   b  on b.id = m.brand_id
join  public.suppliers       s  on s.id = d.supplier_id
left join public.customers   c  on c.id = d.sold_to_customer_id
left join public.profiles    ap on ap.id = d.added_by
left join public.profiles    sp on sp.id = d.sold_by;

-- ============================================================
-- PHASE 7: Row Level Security
-- ============================================================

-- Enable RLS
alter table public.profiles              enable row level security;
alter table public.suppliers             enable row level security;
alter table public.customers             enable row level security;
alter table public.product_categories    enable row level security;
alter table public.products              enable row level security;
alter table public.mobile_brands         enable row level security;
alter table public.mobile_models         enable row level security;
alter table public.mobile_devices        enable row level security;
alter table public.purchase_invoices     enable row level security;
alter table public.purchase_invoice_devices  enable row level security;
alter table public.purchase_invoice_products enable row level security;
alter table public.sale_invoices         enable row level security;
alter table public.sale_invoice_devices  enable row level security;
alter table public.sale_invoice_products enable row level security;
alter table public.audit_logs            enable row level security;

-- ── Helper: is authenticated ──────────────────────────────────────────────────
create or replace function public.is_authenticated()
returns boolean language sql stable security definer as $$
  select auth.uid() is not null;
$$;

-- ── Helper: current user role ─────────────────────────────────────────────────
create or replace function public.current_role()
returns text language sql stable security definer as $$
  select role from public.profiles where id = auth.uid();
$$;

-- ── Profiles: view own, owner/manager view all ────────────────────────────────
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles for select
  using (
    id = auth.uid()
    or public.current_role() in ('owner','manager')
  );

drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_update" on public.profiles for update
  using (id = auth.uid() or public.current_role() = 'owner');

-- ── All other tables: authenticated users can do everything ──────────────────
-- (Adjust per your business rules if needed)

-- Suppliers
drop policy if exists "suppliers_all" on public.suppliers;
create policy "suppliers_all" on public.suppliers for all
  using (public.is_authenticated());

-- Customers
drop policy if exists "customers_all" on public.customers;
create policy "customers_all" on public.customers for all
  using (public.is_authenticated());

-- Product Categories
drop policy if exists "categories_all" on public.product_categories;
create policy "categories_all" on public.product_categories for all
  using (public.is_authenticated());

-- Products
drop policy if exists "products_all" on public.products;
create policy "products_all" on public.products for all
  using (public.is_authenticated());

-- Mobile Brands
drop policy if exists "brands_all" on public.mobile_brands;
create policy "brands_all" on public.mobile_brands for all
  using (public.is_authenticated());

-- Mobile Models
drop policy if exists "models_all" on public.mobile_models;
create policy "models_all" on public.mobile_models for all
  using (public.is_authenticated());

-- Mobile Devices
drop policy if exists "devices_all" on public.mobile_devices;
create policy "devices_all" on public.mobile_devices for all
  using (public.is_authenticated());

-- Purchase Invoices
drop policy if exists "purchase_inv_all" on public.purchase_invoices;
create policy "purchase_inv_all" on public.purchase_invoices for all
  using (public.is_authenticated());

drop policy if exists "purchase_inv_dev_all" on public.purchase_invoice_devices;
create policy "purchase_inv_dev_all" on public.purchase_invoice_devices for all
  using (public.is_authenticated());

drop policy if exists "purchase_inv_prod_all" on public.purchase_invoice_products;
create policy "purchase_inv_prod_all" on public.purchase_invoice_products for all
  using (public.is_authenticated());

-- Sale Invoices
drop policy if exists "sale_inv_all" on public.sale_invoices;
create policy "sale_inv_all" on public.sale_invoices for all
  using (public.is_authenticated());

drop policy if exists "sale_inv_dev_all" on public.sale_invoice_devices;
create policy "sale_inv_dev_all" on public.sale_invoice_devices for all
  using (public.is_authenticated());

drop policy if exists "sale_inv_prod_all" on public.sale_invoice_products;
create policy "sale_inv_prod_all" on public.sale_invoice_products for all
  using (public.is_authenticated());

-- Audit Logs: insert for all, select for owner/manager only
drop policy if exists "audit_insert" on public.audit_logs;
create policy "audit_insert" on public.audit_logs for insert
  with check (public.is_authenticated());

drop policy if exists "audit_select" on public.audit_logs;
create policy "audit_select" on public.audit_logs for select
  using (public.current_role() in ('owner','manager'));

-- ============================================================
-- Done ✅
-- ============================================================
select 'Mobile Shop Control — Schema installed successfully 🎉' as result;
