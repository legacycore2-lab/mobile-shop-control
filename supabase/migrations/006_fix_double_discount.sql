-- ============================================================
-- Migration 006: Fix double-discount in ledger views & RPCs
-- ============================================================
-- المشكلة:
--   total_amount يُخزَّن بعد الخصم مباشرةً:
--     total_amount = lines_total - discount
--   لكن الـ views القديمة كانت تطرح الخصم مرة ثانية:
--     sum(total_amount - discount)  ← خطأ، الخصم اتحسب مرتين
--   الصح:
--     sum(total_amount)             ← النهائي بعد الخصم بالفعل
--
--   remaining في الفاتورة:
--     remaining = total_amount - paid_amount
--   (مش total - paid - discount — لأن total بالفعل بعد الخصم)
-- ============================================================

-- ── 1. Fix supplier_ledger ────────────────────────────────────

create or replace view public.supplier_ledger
with (security_invoker = true) as
select
  s.id               as supplier_id,
  s.name             as supplier_name,
  s.phone            as supplier_phone,
  s.opening_balance,
  coalesce(inv.total_invoiced, 0)  as total_invoiced,
  coalesce(inv.total_paid,    0)   as total_paid,
  s.opening_balance
    + coalesce(inv.total_invoiced, 0)
    - coalesce(inv.total_paid,    0)  as balance
from public.suppliers s
left join (
  select
    supplier_id,
    sum(total_amount)  as total_invoiced,   -- already net of discount
    sum(paid_amount)   as total_paid
  from public.purchase_invoices
  where status = 'confirmed'
  group by supplier_id
) inv on inv.supplier_id = s.id;

grant select on public.supplier_ledger to authenticated;

-- ── 2. Fix customer_ledger ────────────────────────────────────

create or replace view public.customer_ledger
with (security_invoker = true) as
select
  c.id               as customer_id,
  c.name             as customer_name,
  c.phone            as customer_phone,
  c.opening_balance,
  coalesce(inv.total_invoiced, 0)  as total_invoiced,
  coalesce(inv.total_paid,    0)   as total_paid,
  c.opening_balance
    + coalesce(inv.total_invoiced, 0)
    - coalesce(inv.total_paid,    0)  as balance
from public.customers c
left join (
  select
    customer_id,
    sum(total_amount)  as total_invoiced,   -- already net of discount
    sum(paid_amount)   as total_paid
  from public.sale_invoices
  where status = 'confirmed'
    and customer_id is not null
  group by customer_id
) inv on inv.customer_id = c.id;

grant select on public.customer_ledger to authenticated;

-- ── 3. Fix get_supplier_balance helper ───────────────────────

create or replace function public.get_supplier_balance(p_supplier_id uuid)
returns numeric language sql stable as $$
  select coalesce(
    (select opening_balance from public.suppliers where id = p_supplier_id), 0
  )
  +
  coalesce(
    (select sum(total_amount)     -- already net of discount
     from public.purchase_invoices
     where supplier_id = p_supplier_id and status = 'confirmed'), 0
  )
  -
  coalesce(
    (select sum(paid_amount)
     from public.purchase_invoices
     where supplier_id = p_supplier_id and status = 'confirmed'), 0
  );
$$;

-- ── 4. Fix get_customer_balance helper ───────────────────────

create or replace function public.get_customer_balance(p_customer_id uuid)
returns numeric language sql stable as $$
  select coalesce(
    (select opening_balance from public.customers where id = p_customer_id), 0
  )
  +
  coalesce(
    (select sum(total_amount)     -- already net of discount
     from public.sale_invoices
     where customer_id = p_customer_id and status = 'confirmed'), 0
  )
  -
  coalesce(
    (select sum(paid_amount)
     from public.sale_invoices
     where customer_id = p_customer_id and status = 'confirmed'), 0
  );
$$;

-- ── 5. Fix get_purchase_invoices RPC — remaining without double discount ──────

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
    coalesce(s.name, '—')                         as supplier_name,
    pi.invoice_date,
    pi.total_amount,
    pi.paid_amount,
    pi.discount,
    greatest(0, pi.total_amount - pi.paid_amount) as remaining,  -- total already net of discount
    pi.notes,
    pi.status,
    pi.created_by,
    coalesce(p.full_name, '—')                    as created_by_name,
    coalesce(dc.cnt, 0)                           as devices_count,
    coalesce(pc.cnt, 0)                           as products_count,
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

-- ── 6. Fix get_sale_invoices RPC — remaining without double discount ──────────

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
    c.name                                        as customer_name,
    c.phone                                       as customer_phone,
    si.invoice_date,
    si.total_amount,
    si.paid_amount,
    si.discount,
    greatest(0, si.total_amount - si.paid_amount) as remaining,  -- total already net of discount
    si.notes,
    si.status,
    si.created_by,
    coalesce(p.full_name, '—')                    as created_by_name,
    coalesce(dc.cnt, 0)                           as devices_count,
    coalesce(pc.cnt, 0)                           as products_count,
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
