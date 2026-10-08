-- ══════════════════════════════════════════════════════════════════════════════
-- Migration 017: أسعار المنتج من أعلى سعر شراء وأعلى سعر بيع في الفواتير المؤكدة
-- ══════════════════════════════════════════════════════════════════════════════
-- products.cost_price    = أعلى سعر شراء (unit_price) في فواتير الشراء المؤكدة
-- products.selling_price = أعلى سعر بيع (line_selling_price) المكتوب في سطور الفواتير المؤكدة
-- يستبدل منطق migration 016 (آخر سعر) بأعلى سعر.

-- ── 1. سعر البيع المستهدف على سطر المنتج في فاتورة الشراء ─────────────────────
alter table public.purchase_invoice_products
  add column if not exists line_selling_price numeric(12,2);

-- ── 2. دالة حساب أسعار منتج من الفواتير المؤكدة ──────────────────────────────
create or replace function public.refresh_product_prices(p_product_id uuid)
returns void
language plpgsql security invoker as $$
declare
  v_cost numeric(12,2);
  v_sell numeric(12,2);
begin
  select max(pip.unit_price), max(pip.line_selling_price)
    into v_cost, v_sell
  from public.purchase_invoice_products pip
  join public.purchase_invoices pi on pi.id = pip.invoice_id
  where pip.product_id = p_product_id
    and pi.status = 'confirmed';

  -- لو مفيش فواتير مؤكدة (أو مفيش سعر بيع مكتوب) السعر الحالي يفضل زي ما هو
  update public.products
  set cost_price    = coalesce(v_cost, cost_price),
      selling_price = coalesce(v_sell, selling_price),
      updated_at    = now()
  where id = p_product_id;
end;
$$;

grant execute on function public.refresh_product_prices(uuid) to authenticated;

-- ── 3. confirm_purchase_invoice ───────────────────────────────────────────────
create or replace function public.confirm_purchase_invoice(p_invoice_id uuid)
returns void
language plpgsql security invoker as $$
declare
  v_status text;
  v_line   record;
begin
  select status into v_status
  from public.purchase_invoices
  where id = p_invoice_id;

  if not found then
    raise exception 'الفاتورة غير موجودة';
  end if;

  if v_status <> 'draft' then
    raise exception 'لا يمكن تأكيد فاتورة بحالة: %', v_status;
  end if;

  update public.purchase_invoices
  set status     = 'confirmed',
      updated_at = now()
  where id = p_invoice_id;

  update public.mobile_devices
  set status     = 'in_stock',
      updated_at = now()
  where id in (
    select device_id
    from public.purchase_invoice_devices
    where invoice_id = p_invoice_id
  );

  for v_line in
    select product_id, quantity
    from public.purchase_invoice_products
    where invoice_id = p_invoice_id
  loop
    update public.products
    set stock_qty  = greatest(0, stock_qty + v_line.quantity),
        updated_at = now()
    where id = v_line.product_id;

    perform public.refresh_product_prices(v_line.product_id);
  end loop;
end;
$$;

grant execute on function public.confirm_purchase_invoice(uuid) to authenticated;

-- ── 4. cancel_purchase_invoice ────────────────────────────────────────────────
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
  select status into v_status
  from public.purchase_invoices
  where id = p_invoice_id;

  if not found then
    raise exception 'الفاتورة غير موجودة';
  end if;

  if v_status = 'cancelled' then
    raise exception 'الفاتورة ملغاة بالفعل';
  end if;

  if v_status = 'confirmed' then

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

  update public.purchase_invoices
  set status              = 'cancelled',
      cancellation_reason = p_reason,
      updated_at          = now()
  where id = p_invoice_id;

  if v_status = 'confirmed' then
    for v_line in
      select product_id
      from public.purchase_invoice_products
      where invoice_id = p_invoice_id
    loop
      perform public.refresh_product_prices(v_line.product_id);
    end loop;
  end if;
end;
$$;

grant execute on function public.cancel_purchase_invoice(uuid, text) to authenticated;

-- ── 5. إزالة دالة 016 القديمة (آخر سعر) ──────────────────────────────────────
drop function if exists public._refresh_product_cost(uuid);

-- ── 6. تصحيح سعر الشراء الحالي لأعلى سعر في الفواتير المؤكدة ─────────────────
update public.products pr
set cost_price = agg.max_cost,
    updated_at = now()
from (
  select pip.product_id, max(pip.unit_price) as max_cost
  from public.purchase_invoice_products pip
  join public.purchase_invoices pi on pi.id = pip.invoice_id
  where pi.status = 'confirmed'
  group by pip.product_id
) agg
where pr.id = agg.product_id
  and pr.cost_price is distinct from agg.max_cost;
