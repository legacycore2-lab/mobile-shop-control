-- 027_totals_net_of_discount.sql
-- total_amount لازم يكون "بعد الخصم" (زي ما 006 قرّر)، لكن triggers بنود الفاتورة
-- (003) كانت بتحسبه إجمالي البنود بدون خصم، فالخصم كان بيظهر كمتبقي على العميل/المورد.

create or replace function public._recompute_sale_total(p_invoice_id uuid)
returns void language plpgsql security definer as $$
declare
  v_device_total  numeric;
  v_product_total numeric;
begin
  select coalesce(sum(actual_selling_price), 0) into v_device_total
  from public.sale_invoice_devices where invoice_id = p_invoice_id;

  select coalesce(sum(subtotal), 0) into v_product_total
  from public.sale_invoice_products where invoice_id = p_invoice_id;

  update public.sale_invoices
  set total_amount = greatest(0, v_device_total + v_product_total - coalesce(discount, 0))
  where id = p_invoice_id;
end;
$$;

create or replace function public._recompute_purchase_total(p_invoice_id uuid)
returns void language plpgsql security definer as $$
declare
  v_device_total  numeric;
  v_product_total numeric;
begin
  select coalesce(sum(cost_price), 0) into v_device_total
  from public.purchase_invoice_devices where invoice_id = p_invoice_id;

  select coalesce(sum(subtotal), 0) into v_product_total
  from public.purchase_invoice_products where invoice_id = p_invoice_id;

  update public.purchase_invoices
  set total_amount = greatest(0, v_device_total + v_product_total - coalesce(discount, 0))
  where id = p_invoice_id;
end;
$$;

-- تغيير الخصم بعد إنشاء الفاتورة يعيد حساب الإجمالي
create or replace function public.trg_sync_sale_discount()
returns trigger language plpgsql security definer as $$
begin
  if new.discount is distinct from old.discount then
    perform public._recompute_sale_total(new.id);
  end if;
  return null;
end;
$$;

create or replace function public.trg_sync_purchase_discount()
returns trigger language plpgsql security definer as $$
begin
  if new.discount is distinct from old.discount then
    perform public._recompute_purchase_total(new.id);
  end if;
  return null;
end;
$$;

drop trigger if exists trg_sale_discount     on public.sale_invoices;
drop trigger if exists trg_purchase_discount on public.purchase_invoices;

create trigger trg_sale_discount
  after update of discount on public.sale_invoices
  for each row execute function public.trg_sync_sale_discount();

create trigger trg_purchase_discount
  after update of discount on public.purchase_invoices
  for each row execute function public.trg_sync_purchase_discount();

-- تصحيح الفواتير الموجودة (اللي ليها خصم بس)
do $$
declare
  r record;
begin
  for r in select id from public.sale_invoices where coalesce(discount, 0) <> 0 loop
    perform public._recompute_sale_total(r.id);
  end loop;
  for r in select id from public.purchase_invoices where coalesce(discount, 0) <> 0 loop
    perform public._recompute_purchase_total(r.id);
  end loop;
end;
$$;
