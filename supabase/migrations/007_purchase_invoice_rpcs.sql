-- ══════════════════════════════════════════════════════════════════════════════
-- Migration 007: Purchase Invoice RPCs (confirm + cancel) + cancellation_reason
-- ══════════════════════════════════════════════════════════════════════════════

-- ── 1. Add cancellation_reason column to purchase_invoices ────────────────────
alter table public.purchase_invoices
  add column if not exists cancellation_reason text;

-- ── 2. Add remaining computed column (if not exists as real column) ───────────
-- remaining is calculated at query time in the RPC, but the InvoiceDrawer
-- reads it from getById which uses INVOICE_SELECT directly.
-- We add it as a generated/stored column so direct .select() also works.
alter table public.purchase_invoices
  add column if not exists remaining numeric(12,2) generated always as
    (greatest(0, total_amount - paid_amount)) stored;

-- ── 3. confirm_purchase_invoice RPC ──────────────────────────────────────────
-- Sets status = 'confirmed' and increments stock_qty for all product lines
create or replace function public.confirm_purchase_invoice(p_invoice_id uuid)
returns void
language plpgsql security invoker as $$
declare
  v_status text;
  v_line   record;
begin
  -- Validate invoice exists and is in draft
  select status into v_status
  from public.purchase_invoices
  where id = p_invoice_id;

  if not found then
    raise exception 'الفاتورة غير موجودة';
  end if;

  if v_status <> 'draft' then
    raise exception 'لا يمكن تأكيد فاتورة بحالة: %', v_status;
  end if;

  -- Update invoice status
  update public.purchase_invoices
  set status     = 'confirmed',
      updated_at = now()
  where id = p_invoice_id;

  -- Update device status to in_stock
  update public.mobile_devices
  set status     = 'in_stock',
      updated_at = now()
  where id in (
    select device_id
    from public.purchase_invoice_devices
    where invoice_id = p_invoice_id
  );

  -- Increment product stock quantities
  for v_line in
    select product_id, quantity
    from public.purchase_invoice_products
    where invoice_id = p_invoice_id
  loop
    update public.products
    set stock_qty  = greatest(0, stock_qty + v_line.quantity),
        updated_at = now()
    where id = v_line.product_id;
  end loop;

end;
$$;

grant execute on function public.confirm_purchase_invoice(uuid) to authenticated;

-- ── 4. cancel_purchase_invoice RPC ───────────────────────────────────────────
-- Sets status = 'cancelled', stores reason, reverses stock changes
create or replace function public.cancel_purchase_invoice(
  p_invoice_id uuid,
  p_reason     text default null
)
returns void
language plpgsql security invoker as $$
declare
  v_status text;
  v_line   record;
begin
  -- Validate invoice exists
  select status into v_status
  from public.purchase_invoices
  where id = p_invoice_id;

  if not found then
    raise exception 'الفاتورة غير موجودة';
  end if;

  if v_status = 'cancelled' then
    raise exception 'الفاتورة ملغاة بالفعل';
  end if;

  -- If confirmed, reverse the stock changes first
  if v_status = 'confirmed' then

    -- Reverse product stock
    for v_line in
      select product_id, quantity
      from public.purchase_invoice_products
      where invoice_id = p_invoice_id
    loop
      update public.products
      set stock_qty  = greatest(0, stock_qty - v_line.quantity),
          updated_at = now()
      where id = v_line.product_id;
    end loop;

    -- Set devices back to a neutral state (not sold, but removed from stock)
    update public.mobile_devices
    set status     = 'cancelled',
        updated_at = now()
    where id in (
      select device_id
      from public.purchase_invoice_devices
      where invoice_id = p_invoice_id
    )
    and status = 'in_stock';

  end if;

  -- Update invoice
  update public.purchase_invoices
  set status               = 'cancelled',
      cancellation_reason  = p_reason,
      updated_at           = now()
  where id = p_invoice_id;

end;
$$;

grant execute on function public.cancel_purchase_invoice(uuid, text) to authenticated;

-- ── 5. Update get_purchase_invoices to include cancellation_reason ─────────────
create or replace function public.get_purchase_invoices()
returns table (
  id                   uuid,
  invoice_number       text,
  supplier_id          uuid,
  supplier_name        text,
  invoice_date         date,
  total_amount         numeric,
  paid_amount          numeric,
  discount             numeric,
  remaining            numeric,
  notes                text,
  status               text,
  cancellation_reason  text,
  created_by           uuid,
  created_by_name      text,
  devices_count        bigint,
  products_count       bigint,
  created_at           timestamptz,
  updated_at           timestamptz
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
    greatest(0, pi.total_amount - pi.paid_amount) as remaining,
    pi.notes,
    pi.status,
    pi.cancellation_reason,
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
