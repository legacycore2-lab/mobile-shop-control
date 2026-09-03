-- ============================================================
-- Mobile Shop Control — Payments & Ledger Schema
-- Migration: 002_payments_schema.sql
-- Safe to run multiple times (idempotent)
-- ============================================================

-- ── Payments Table ────────────────────────────────────────────────────────────
-- يسجل كل دفعة على أي فاتورة (شراء أو بيع)

create table if not exists public.payments (
  id              uuid          primary key default uuid_generate_v4(),
  payment_type    text          not null check (payment_type in ('purchase', 'sale')),
  invoice_id      uuid          not null,
  invoice_number  text          not null,
  party_type      text          not null check (party_type in ('supplier', 'customer')),
  party_id        uuid          not null,
  amount          numeric(12,2) not null check (amount > 0),
  payment_method  text          not null default 'cash'
                    check (payment_method in ('cash', 'bank_transfer', 'check', 'other')),
  payment_date    date          not null default current_date,
  notes           text,
  created_by      uuid          references public.profiles(id),
  created_at      timestamptz   not null default now()
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
create index if not exists payments_invoice_id_idx  on public.payments(invoice_id);
create index if not exists payments_party_id_idx    on public.payments(party_id);
create index if not exists payments_payment_date_idx on public.payments(payment_date);
create index if not exists payments_type_idx        on public.payments(payment_type);

-- ── RLS ───────────────────────────────────────────────────────────────────────
alter table public.payments enable row level security;

drop policy if exists "payments_all" on public.payments;
create policy "payments_all" on public.payments
  for all using (auth.role() = 'authenticated');

-- ── Helper: get supplier balance ─────────────────────────────────────────────
-- إجمالي المديونية = opening_balance + مجموع الفواتير المؤكدة - مجموع المدفوعات

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
    (select sum(amount)
     from public.payments
     where party_id = p_supplier_id and party_type = 'supplier'), 0
  );
$$;

-- ── Helper: get customer balance ──────────────────────────────────────────────
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
    (select sum(amount)
     from public.payments
     where party_id = p_customer_id and party_type = 'customer'), 0
  );
$$;

-- ── View: supplier ledger ─────────────────────────────────────────────────────
create or replace view public.supplier_ledger as
select
  s.id            as supplier_id,
  s.name          as supplier_name,
  s.phone         as supplier_phone,
  s.opening_balance,
  coalesce(inv.total_invoiced, 0)   as total_invoiced,
  coalesce(pay.total_paid,     0)   as total_paid,
  s.opening_balance
    + coalesce(inv.total_invoiced, 0)
    - coalesce(pay.total_paid,    0) as balance
from public.suppliers s
left join (
  select supplier_id, sum(total_amount - discount) as total_invoiced
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

-- ── View: customer ledger ─────────────────────────────────────────────────────
create or replace view public.customer_ledger as
select
  c.id            as customer_id,
  c.name          as customer_name,
  c.phone         as customer_phone,
  c.opening_balance,
  coalesce(inv.total_invoiced, 0)   as total_invoiced,
  coalesce(pay.total_paid,     0)   as total_paid,
  c.opening_balance
    + coalesce(inv.total_invoiced, 0)
    - coalesce(pay.total_paid,    0) as balance
from public.customers c
left join (
  select customer_id, sum(total_amount - discount) as total_invoiced
  from public.sale_invoices
  where status = 'confirmed' and customer_id is not null
  group by customer_id
) inv on inv.customer_id = c.id
left join (
  select party_id, sum(amount) as total_paid
  from public.payments
  where party_type = 'customer'
  group by party_id
) pay on pay.party_id = c.id;

