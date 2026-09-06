-- ============================================================
-- Mobile Shop Control — Migration 003
-- Fix: paid_amount sync triggers + corrected RPCs + remaining view
-- Safe to run multiple times (idempotent)
-- ============================================================

-- ══════════════════════════════════════════════════════════════
-- SECTION 1: Triggers to keep paid_amount in sync with payments
-- ══════════════════════════════════════════════════════════════
-- المشكلة: paid_amount على الفاتورة لا يتحدث عند تسجيل / حذف دفعة
-- الحل: trigger يعيد حساب paid_amount من جدول payments فور أي تغيير

-- ── Helper: recompute purchase invoice paid_amount ────────────
create or replace function public._recompute_purchase_paid(p_invoice_id uuid)
returns void language plpgsql security definer as $$
begin
  update public.purchase_invoices
  set paid_amount = coalesce(
    (select sum(amount)
     from public.payments
     where invoice_id = p_invoice_id
       and payment_type = 'purchase'),
    0
  )
  where id = p_invoice_id;
end;
$$;

-- ── Helper: recompute sale invoice paid_amount ────────────────
create or replace function public._recompute_sale_paid(p_invoice_id uuid)
returns void language plpgsql security definer as $$
begin
  update public.sale_invoices
  set paid_amount = coalesce(
    (select sum(amount)
     from public.payments
     where invoice_id = p_invoice_id
       and payment_type = 'sale'),
    0
  )
  where id = p_invoice_id;
end;
$$;

-- ── Trigger function: fires after INSERT / UPDATE / DELETE on payments ─
create or replace function public.trg_sync_invoice_paid_amount()
returns trigger language plpgsql security definer as $$
declare
  v_invoice_id uuid;
  v_type       text;
begin
  -- Determine the affected invoice
  if TG_OP = 'DELETE' then
    v_invoice_id := OLD.invoice_id;
    v_type       := OLD.payment_type;
  else
    v_invoice_id := NEW.invoice_id;
    v_type       := NEW.payment_type;
  end if;

  if v_type = 'purchase' then
    perform public._recompute_purchase_paid(v_invoice_id);
  elsif v_type = 'sale' then
    perform public._recompute_sale_paid(v_invoice_id);
  end if;

  return null; -- AFTER trigger, return value ignored
end;
$$;

-- ── Drop old trigger if exists, then create ───────────────────
drop trigger if exists trg_sync_invoice_paid on public.payments;

create trigger trg_sync_invoice_paid
  after insert or update or delete on public.payments
  for each row execute function public.trg_sync_invoice_paid_amount();

-- ══════════════════════════════════════════════════════════════
-- SECTION 2: One-time backfill — fix existing invoices
-- ══════════════════════════════════════════════════════════════
-- يصلح كل الفواتير الموجودة اللي paid_amount بتاعها غلط

do $$
declare
  r record;
begin
  -- Purchase invoices
  for r in
    select distinct invoice_id, payment_type
    from public.payments
    where payment_type = 'purchase'
  loop
    perform public._recompute_purchase_paid(r.invoice_id);
  end loop;

  -- Sale invoices
  for r in
    select distinct invoice_id, payment_type
    from public.payments
    where payment_type = 'sale'
  loop
    perform public._recompute_sale_paid(r.invoice_id);
  end loop;
end;
$$;

-- ══════════════════════════════════════════════════════════════
-- SECTION 3: Fix get_purchase_invoices RPC
-- ══════════════════════════════════════════════════════════════
-- يحسب remaining صح من الـ paid_amount المحدّث + discount

create or replace function public.get_purchase_invoices()
returns table (
  id              uuid,
  invoice_number  text,
  supplier_id     uuid,
  supplier_name   text,
  invoice_date    date,
  total_amount    numeric,
  paid_amount     numeric,
  discount        numeric,
  remaining       numeric,
  notes           text,
  status          text,
  created_by      uuid,
  created_by_name text,
  devices_count   bigint,
  products_count  bigint,
  created_at      timestamptz,
  updated_at      timestamptz
)
language sql stable security invoker as $$
  select
    pi.id,
    pi.invoice_number,
    pi.supplier_id,
    coalesce(s.name, '—')           as supplier_name,
    pi.invoice_date,
    pi.total_amount,
    pi.paid_amount,
    pi.discount,
    greatest(0, pi.total_amount - pi.paid_amount - pi.discount) as remaining,
    pi.notes,
    pi.status,
    pi.created_by,
    coalesce(p.full_name, '—')      as created_by_name,
    coalesce(dc.cnt, 0)             as devices_count,
    coalesce(pc.cnt, 0)             as products_count,
    pi.created_at,
    pi.updated_at
  from public.purchase_invoices pi
  left join public.suppliers s  on s.id  = pi.supplier_id
  left join public.profiles  p  on p.id  = pi.created_by
  left join (
    select invoice_id, count(*) as cnt
    from public.purchase_invoice_devices
    group by invoice_id
  ) dc on dc.invoice_id = pi.id
  left join (
    select invoice_id, count(*) as cnt
    from public.purchase_invoice_products
    group by invoice_id
  ) pc on pc.invoice_id = pi.id
  order by pi.created_at desc;
$$;

grant execute on function public.get_purchase_invoices() to authenticated;

-- ══════════════════════════════════════════════════════════════
-- SECTION 4: Fix get_sale_invoices RPC (add if missing)
-- ══════════════════════════════════════════════════════════════

create or replace function public.get_sale_invoices()
returns table (
  id              uuid,
  invoice_number  text,
  customer_id     uuid,
  customer_name   text,
  customer_phone  text,
  invoice_date    date,
  total_amount    numeric,
  paid_amount     numeric,
  discount        numeric,
  remaining       numeric,
  notes           text,
  status          text,
  created_by      uuid,
  created_by_name text,
  devices_count   bigint,
  products_count  bigint,
  created_at      timestamptz,
  updated_at      timestamptz
)
language sql stable security invoker as $$
  select
    si.id,
    si.invoice_number,
    si.customer_id,
    c.name                          as customer_name,
    c.phone                         as customer_phone,
    si.invoice_date,
    si.total_amount,
    si.paid_amount,
    si.discount,
    greatest(0, si.total_amount - si.paid_amount - si.discount) as remaining,
    si.notes,
    si.status,
    si.created_by,
    coalesce(p.full_name, '—')      as created_by_name,
    coalesce(dc.cnt, 0)             as devices_count,
    coalesce(pc.cnt, 0)             as products_count,
    si.created_at,
    si.updated_at
  from public.sale_invoices si
  left join public.customers c  on c.id  = si.customer_id
  left join public.profiles  p  on p.id  = si.created_by
  left join (
    select invoice_id, count(*) as cnt
    from public.sale_invoice_devices
    group by invoice_id
  ) dc on dc.invoice_id = si.id
  left join (
    select invoice_id, count(*) as cnt
    from public.sale_invoice_products
    group by invoice_id
  ) pc on pc.invoice_id = si.id
  order by si.created_at desc;
$$;

grant execute on function public.get_sale_invoices() to authenticated;

-- ══════════════════════════════════════════════════════════════
-- SECTION 5: Fix supplier_ledger view — include discount in balance
-- ══════════════════════════════════════════════════════════════
-- الـ view الحالي: balance = opening + total_amount - paid
-- الصح:           balance = opening + (total_amount - discount) - paid
-- (لأن الخصم يقلل من المديونية)

create or replace view public.supplier_ledger
with (security_invoker = true) as
select
  s.id               as supplier_id,
  s.name             as supplier_name,
  s.phone            as supplier_phone,
  s.opening_balance,
  coalesce(inv.total_invoiced, 0)  as total_invoiced,
  coalesce(pay.total_paid,    0)   as total_paid,
  -- balance = ما عليه = (افتتاحي + فواتير - خصومات) - مدفوع
  s.opening_balance
    + coalesce(inv.total_invoiced, 0)
    - coalesce(pay.total_paid,    0) as balance
from public.suppliers s
left join (
  select
    supplier_id,
    sum(total_amount - discount) as total_invoiced
  from public.purchase_invoices
  where status = 'confirmed'
  group by supplier_id
) inv on inv.supplier_id = s.id
left join (
  select party_id, sum(amount) as total_paid
  from public.payments
  where party_type = 'supplier'
  group by party_id
) pay on pay.party_id = s.id;

grant select on public.supplier_ledger to authenticated;

-- ══════════════════════════════════════════════════════════════
-- SECTION 6: Fix customer_ledger view — same discount fix
-- ══════════════════════════════════════════════════════════════

create or replace view public.customer_ledger
with (security_invoker = true) as
select
  c.id               as customer_id,
  c.name             as customer_name,
  c.phone            as customer_phone,
  c.opening_balance,
  coalesce(inv.total_invoiced, 0)  as total_invoiced,
  coalesce(pay.total_paid,    0)   as total_paid,
  c.opening_balance
    + coalesce(inv.total_invoiced, 0)
    - coalesce(pay.total_paid,    0) as balance
from public.customers c
left join (
  select
    customer_id,
    sum(total_amount - discount) as total_invoiced
  from public.sale_invoices
  where status = 'confirmed'
    and customer_id is not null
  group by customer_id
) inv on inv.customer_id = c.id
left join (
  select party_id, sum(amount) as total_paid
  from public.payments
  where party_type = 'customer'
  group by party_id
) pay on pay.party_id = c.id;

grant select on public.customer_ledger to authenticated;

-- ══════════════════════════════════════════════════════════════
-- SECTION 7: Fix subtotal trigger on invoice_products
-- ══════════════════════════════════════════════════════════════
-- subtotal = quantity × unit_price — يتحسب تلقائياً

create or replace function public.trg_calc_product_subtotal()
returns trigger language plpgsql as $$
begin
  NEW.subtotal := NEW.quantity * NEW.unit_price;
  return NEW;
end;
$$;

drop trigger if exists trg_purchase_product_subtotal on public.purchase_invoice_products;
create trigger trg_purchase_product_subtotal
  before insert or update on public.purchase_invoice_products
  for each row execute function public.trg_calc_product_subtotal();

drop trigger if exists trg_sale_product_subtotal on public.sale_invoice_products;
create trigger trg_sale_product_subtotal
  before insert or update on public.sale_invoice_products
  for each row execute function public.trg_calc_product_subtotal();

-- ══════════════════════════════════════════════════════════════
-- SECTION 8: Fix total_amount trigger on purchase invoices
-- ══════════════════════════════════════════════════════════════
-- total_amount = Σ device costs + Σ product subtotals
-- يتحسب كل ما تتغير بنود الفاتورة

create or replace function public._recompute_purchase_total(p_invoice_id uuid)
returns void language plpgsql security definer as $$
declare
  v_device_total  numeric;
  v_product_total numeric;
begin
  select coalesce(sum(cost_price), 0)
  into v_device_total
  from public.purchase_invoice_devices
  where invoice_id = p_invoice_id;

  select coalesce(sum(subtotal), 0)
  into v_product_total
  from public.purchase_invoice_products
  where invoice_id = p_invoice_id;

  update public.purchase_invoices
  set total_amount = v_device_total + v_product_total
  where id = p_invoice_id;
end;
$$;

create or replace function public.trg_sync_purchase_total()
returns trigger language plpgsql security definer as $$
begin
  if TG_OP = 'DELETE' then
    perform public._recompute_purchase_total(OLD.invoice_id);
  else
    perform public._recompute_purchase_total(NEW.invoice_id);
  end if;
  return null;
end;
$$;

drop trigger if exists trg_purchase_device_total   on public.purchase_invoice_devices;
drop trigger if exists trg_purchase_product_total  on public.purchase_invoice_products;

create trigger trg_purchase_device_total
  after insert or update or delete on public.purchase_invoice_devices
  for each row execute function public.trg_sync_purchase_total();

create trigger trg_purchase_product_total
  after insert or update or delete on public.purchase_invoice_products
  for each row execute function public.trg_sync_purchase_total();

-- ══════════════════════════════════════════════════════════════
-- SECTION 9: Fix total_amount trigger on sale invoices
-- ══════════════════════════════════════════════════════════════

create or replace function public._recompute_sale_total(p_invoice_id uuid)
returns void language plpgsql security definer as $$
declare
  v_device_total  numeric;
  v_product_total numeric;
begin
  select coalesce(sum(actual_selling_price), 0)
  into v_device_total
  from public.sale_invoice_devices
  where invoice_id = p_invoice_id;

  select coalesce(sum(subtotal), 0)
  into v_product_total
  from public.sale_invoice_products
  where invoice_id = p_invoice_id;

  update public.sale_invoices
  set total_amount = v_device_total + v_product_total
  where id = p_invoice_id;
end;
$$;

create or replace function public.trg_sync_sale_total()
returns trigger language plpgsql security definer as $$
begin
  if TG_OP = 'DELETE' then
    perform public._recompute_sale_total(OLD.invoice_id);
  else
    perform public._recompute_sale_total(NEW.invoice_id);
  end if;
  return null;
end;
$$;

drop trigger if exists trg_sale_device_total   on public.sale_invoice_devices;
drop trigger if exists trg_sale_product_total  on public.sale_invoice_products;

create trigger trg_sale_device_total
  after insert or update or delete on public.sale_invoice_devices
  for each row execute function public.trg_sync_sale_total();

create trigger trg_sale_product_total
  after insert or update or delete on public.sale_invoice_products
  for each row execute function public.trg_sync_sale_total();

-- ══════════════════════════════════════════════════════════════
-- SECTION 10: Backfill total_amount for existing invoices
-- ══════════════════════════════════════════════════════════════

do $$
declare
  r record;
begin
  for r in select id from public.purchase_invoices loop
    perform public._recompute_purchase_total(r.id);
  end loop;

  for r in select id from public.sale_invoices loop
    perform public._recompute_sale_total(r.id);
  end loop;
end;
$$;

-- ══════════════════════════════════════════════════════════════
-- SECTION 11: Warranty auto-compute on devices
-- ══════════════════════════════════════════════════════════════
-- warranty_expires_at = purchase_date + warranty_months

create or replace function public.trg_calc_warranty_expiry()
returns trigger language plpgsql as $$
begin
  if NEW.warranty_months is not null and NEW.warranty_months > 0 then
    NEW.warranty_expires_at :=
      (NEW.purchase_date::date + (NEW.warranty_months || ' months')::interval)::date;
  else
    NEW.warranty_expires_at := null;
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_device_warranty on public.mobile_devices;
create trigger trg_device_warranty
  before insert or update of purchase_date, warranty_months
  on public.mobile_devices
  for each row execute function public.trg_calc_warranty_expiry();

-- Backfill warranty_expires_at for existing devices
update public.mobile_devices
set warranty_expires_at =
  (purchase_date + (warranty_months || ' months')::interval)::date
where warranty_months > 0
  and warranty_expires_at is null;

-- ══════════════════════════════════════════════════════════════
-- DONE
-- ══════════════════════════════════════════════════════════════
