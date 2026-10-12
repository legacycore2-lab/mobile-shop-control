-- 031_cancel_sale_cancels_catalog_order.sql
-- إلغاء فاتورة البيع بيلغي طلب الكتالوج المرتبط بيها كمان
-- + تصحيح الطلبات اللي فاتورتها اتلغت قبل كده وفاضلة "تم التسليم"

create or replace function public.cancel_sale_invoice(p_invoice_id uuid)
returns void
language plpgsql
security definer
as $function$
declare
  v_status text;
begin
  select status into v_status
  from public.sale_invoices
  where id = p_invoice_id;

  if not found then
    raise exception 'INVOICE_NOT_FOUND';
  end if;

  if v_status = 'cancelled' then
    raise exception 'INVOICE_ALREADY_CANCELLED';
  end if;

  insert into public.sale_invoice_cancel_snapshots
    (invoice_id, total_amount, discount, devices, products)
  select
    si.id,
    coalesce(si.total_amount, 0),
    coalesce(si.discount, 0),
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',                   sid.id,
        'device_id',            sid.device_id,
        'actual_selling_price', sid.actual_selling_price,
        'brand_name',           coalesce(mb.name, '—'),
        'model_name',           coalesce(mm.name, '—'),
        'imei1',                coalesce(md.imei1, '—'),
        'cost_price',           coalesce(md.cost_price, 0)
      ))
      from public.sale_invoice_devices sid
      left join public.mobile_devices md on md.id = sid.device_id
      left join public.mobile_models  mm on mm.id = md.model_id
      left join public.mobile_brands  mb on mb.id = mm.brand_id
      where sid.invoice_id = si.id
    ), '[]'::jsonb),
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',           sip.id,
        'product_id',   sip.product_id,
        'quantity',     sip.quantity,
        'unit_price',   sip.unit_price,
        'subtotal',     sip.subtotal,
        'product_name', coalesce(p.name, '—'),
        'unit',         coalesce(p.unit, 'قطعة'),
        'cost_price',   coalesce(p.cost_price, 0)
      ))
      from public.sale_invoice_products sip
      left join public.products p on p.id = sip.product_id
      where sip.invoice_id = si.id
    ), '[]'::jsonb)
  from public.sale_invoices si
  where si.id = p_invoice_id
  on conflict (invoice_id) do nothing;

  update public.mobile_devices
  set
    status               = 'in_stock',
    sold_to_customer_id  = null,
    actual_selling_price = null,
    sold_at              = null,
    sold_by              = null,
    sale_invoice_id      = null,
    updated_at           = now()
  where id in (
    select device_id from public.sale_invoice_devices
    where invoice_id = p_invoice_id
  );

  delete from public.sale_invoice_devices  where invoice_id = p_invoice_id;
  delete from public.sale_invoice_products where invoice_id = p_invoice_id;

  -- الفاتورة اتلغت: امسح دفعاتها عشان ما يفضلش رصيد معلّق
  delete from public.payments
  where invoice_id = p_invoice_id and payment_type = 'sale';

  update public.sale_invoices
  set status = 'cancelled', paid_amount = 0, updated_at = now()
  where id = p_invoice_id;

  -- طلب الكتالوج المرتبط بالفاتورة يتحول لملغي
  update public.catalog_orders
  set status = 'cancelled', updated_at = now()
  where sale_invoice_id = p_invoice_id
    and status <> 'cancelled';
end;
$function$;

-- تصحيح: طلبات فاتورتها ملغاة وفاضلة بحالة غير ملغي
update public.catalog_orders o
set status = 'cancelled', updated_at = now()
from public.sale_invoices si
where si.id = o.sale_invoice_id
  and si.status = 'cancelled'
  and o.status <> 'cancelled';
