-- ══════════════════════════════════════════════════════════════════════════════
-- Migration 016: سعر شراء المنتج = سعر آخر فاتورة شراء مؤكدة
-- ══════════════════════════════════════════════════════════════════════════════
-- المشكلة: confirm_purchase_invoice كانت بتزوّد المخزون بس ومبتحدّثش products.cost_price،
-- فالسعر كان بيفضل على القيمة اللي اتسجلت وقت إنشاء المنتج.
-- الحل: دالة واحدة بتحسب السعر من آخر سطر في فاتورة مؤكدة، وبتتنادى عند التأكيد والإلغاء.
-- "آخر" = الأحدث بتاريخ الفاتورة، وعند التساوي بوقت إنشاء الفاتورة.

-- ── 1. دالة تحديث سعر شراء منتج من آخر فاتورة مؤكدة ──────────────────────────
create or replace function public._refresh_product_cost(p_product_id uuid)
returns void
language plpgsql security invoker as $$
declare
  v_price numeric(12,2);
begin
  select pip.unit_price
    into v_price
  from public.purchase_invoice_products pip
  join public.purchase_invoices pi on pi.id = pip.invoice_id
  where pip.product_id = p_product_id
    and pi.status = 'confirmed'
  order by pi.invoice_date desc, pi.created_at desc, pip.created_at desc
  limit 1;

  -- لو مفيش فاتورة مؤكدة (اتلغت كلها) السعر الحالي يفضل زي ما هو
  if v_price is not null then
    update public.products
    set cost_price = v_price,
        updated_at = now()
    where id = p_product_id;
  end if;
end;
$$;

grant execute on function public._refresh_product_cost(uuid) to authenticated;

-- ── 2. confirm_purchase_invoice ───────────────────────────────────────────────
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

    perform public._refresh_product_cost(v_line.product_id);
  end loop;
end;
$$;

grant execute on function public.confirm_purchase_invoice(uuid) to authenticated;

-- ── 3. cancel_purchase_invoice ────────────────────────────────────────────────
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

  -- بعد تغيير حالة الفاتورة: رجّع سعر كل منتج لآخر فاتورة مؤكدة متبقية
  if v_status = 'confirmed' then
    for v_line in
      select product_id
      from public.purchase_invoice_products
      where invoice_id = p_invoice_id
    loop
      perform public._refresh_product_cost(v_line.product_id);
    end loop;
  end if;
end;
$$;

grant execute on function public.cancel_purchase_invoice(uuid, text) to authenticated;

-- ── 4. تصحيح الأسعار الحالية (Backfill) ──────────────────────────────────────
-- يضبط cost_price لكل منتج له فاتورة مؤكدة على سعر آخر فاتورة
update public.products pr
set cost_price = last_line.unit_price,
    updated_at = now()
from (
  select distinct on (pip.product_id)
         pip.product_id,
         pip.unit_price
  from public.purchase_invoice_products pip
  join public.purchase_invoices pi on pi.id = pip.invoice_id
  where pi.status = 'confirmed'
  order by pip.product_id, pi.invoice_date desc, pi.created_at desc, pip.created_at desc
) last_line
where pr.id = last_line.product_id
  and pr.cost_price is distinct from last_line.unit_price;
