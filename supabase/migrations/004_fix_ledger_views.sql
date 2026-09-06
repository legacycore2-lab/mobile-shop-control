-- ============================================================
-- Migration 004: Fix supplier/customer ledger views
-- المشكلة: total_paid كان يُحسب من جدول payments مباشرة
--          وده بيسبب تراكم لو فيه دفعات يتيمة (بلا فاتورة مؤكدة)
-- الحل: total_paid = SUM(paid_amount) من الفواتير المؤكدة
--       لأن الـ trigger trg_sync_invoice_paid_amount
--       هو المصدر الموثوق الوحيد
-- ============================================================

-- ── Fix supplier_ledger ───────────────────────────────────────

create or replace view public.supplier_ledger
with (security_invoker = true) as
select
  s.id               as supplier_id,
  s.name             as supplier_name,
  s.phone            as supplier_phone,
  s.opening_balance,
  coalesce(inv.total_invoiced, 0)  as total_invoiced,
  coalesce(inv.total_paid, 0)      as total_paid,
  s.opening_balance
    + coalesce(inv.total_invoiced, 0)
    - coalesce(inv.total_paid, 0)  as balance
from public.suppliers s
left join (
  select
    supplier_id,
    sum(total_amount - discount) as total_invoiced,
    sum(paid_amount)             as total_paid
  from public.purchase_invoices
  where status = 'confirmed'
  group by supplier_id
) inv on inv.supplier_id = s.id;

grant select on public.supplier_ledger to authenticated;

-- ── Fix customer_ledger ───────────────────────────────────────

create or replace view public.customer_ledger
with (security_invoker = true) as
select
  c.id               as customer_id,
  c.name             as customer_name,
  c.phone            as customer_phone,
  c.opening_balance,
  coalesce(inv.total_invoiced, 0)  as total_invoiced,
  coalesce(inv.total_paid, 0)      as total_paid,
  c.opening_balance
    + coalesce(inv.total_invoiced, 0)
    - coalesce(inv.total_paid, 0)  as balance
from public.customers c
left join (
  select
    customer_id,
    sum(total_amount - discount) as total_invoiced,
    sum(paid_amount)             as total_paid
  from public.sale_invoices
  where status = 'confirmed'
    and customer_id is not null
  group by customer_id
) inv on inv.customer_id = c.id;

grant select on public.customer_ledger to authenticated;

-- ── Fix helper functions for consistency ──────────────────────

create or replace function public.get_supplier_balance(p_supplier_id uuid)
returns numeric language sql stable as $$
  select coalesce(
    (select opening_balance from public.suppliers where id = p_supplier_id), 0
  )
  +
  coalesce(
    (select sum(total_amount - discount)
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

create or replace function public.get_customer_balance(p_customer_id uuid)
returns numeric language sql stable as $$
  select coalesce(
    (select opening_balance from public.customers where id = p_customer_id), 0
  )
  +
  coalesce(
    (select sum(total_amount - discount)
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
