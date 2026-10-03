-- Migration 014: Rebuild details of sale invoices cancelled BEFORE migration 013
-- ─────────────────────────────────────────────────────────────────────────────
-- Source: audit_logs.old_data (device rows that were reset on cancel, and the
-- deleted sale_invoice_devices / sale_invoice_products rows, when logged).
-- Only invoices with no snapshot yet and at least one recovered line are filled.

with cancelled as (
  select id, coalesce(discount, 0) as discount
  from public.sale_invoices si
  where si.status = 'cancelled'
    and not exists (select 1 from public.sale_invoice_cancel_snapshots s where s.invoice_id = si.id)
),
dev_src as (
  -- device reset on cancel: old_data still holds the invoice id and the sale price
  select c.id as invoice_id, a.record_id as device_id,
         (a.old_data->>'actual_selling_price')::numeric as price, a.created_at
  from cancelled c
  join public.audit_logs a
    on a.table_name = 'mobile_devices'
   and a.old_data->>'sale_invoice_id' = c.id::text
   and a.old_data->>'actual_selling_price' is not null
  union all
  -- deleted invoice line rows
  select c.id, (a.old_data->>'device_id')::uuid,
         (a.old_data->>'actual_selling_price')::numeric, a.created_at
  from cancelled c
  join public.audit_logs a
    on a.table_name = 'sale_invoice_devices'
   and a.old_data->>'invoice_id' = c.id::text
),
dev as (
  select distinct on (invoice_id, device_id) invoice_id, device_id, price
  from dev_src
  where device_id is not null
  order by invoice_id, device_id, created_at desc
),
dev_json as (
  select d.invoice_id,
         sum(coalesce(d.price, 0)) as total,
         jsonb_agg(jsonb_build_object(
           'id',                   gen_random_uuid(),
           'device_id',            d.device_id,
           'actual_selling_price', coalesce(d.price, 0),
           'brand_name',           coalesce(mb.name, '—'),
           'model_name',           coalesce(mm.name, '—'),
           'imei1',                coalesce(md.imei1, '—'),
           'cost_price',           coalesce(md.cost_price, 0)
         )) as devices
  from dev d
  left join public.mobile_devices md on md.id = d.device_id
  left join public.mobile_models  mm on mm.id = md.model_id
  left join public.mobile_brands  mb on mb.id = mm.brand_id
  group by d.invoice_id
),
prd as (
  select distinct on (c.id, a.old_data->>'id')
         c.id as invoice_id,
         (a.old_data->>'product_id')::uuid        as product_id,
         (a.old_data->>'quantity')::numeric       as quantity,
         (a.old_data->>'unit_price')::numeric     as unit_price,
         (a.old_data->>'subtotal')::numeric       as subtotal
  from cancelled c
  join public.audit_logs a
    on a.table_name = 'sale_invoice_products'
   and a.old_data->>'invoice_id' = c.id::text
  order by c.id, a.old_data->>'id', a.created_at desc
),
prd_json as (
  select p.invoice_id,
         sum(coalesce(p.subtotal, p.quantity * p.unit_price, 0)) as total,
         jsonb_agg(jsonb_build_object(
           'id',           gen_random_uuid(),
           'product_id',   p.product_id,
           'quantity',     coalesce(p.quantity, 0),
           'unit_price',   coalesce(p.unit_price, 0),
           'subtotal',     coalesce(p.subtotal, p.quantity * p.unit_price, 0),
           'product_name', coalesce(pr.name, '—'),
           'unit',         coalesce(pr.unit, 'قطعة'),
           'cost_price',   coalesce(pr.cost_price, 0)
         )) as products
  from prd p
  left join public.products pr on pr.id = p.product_id
  group by p.invoice_id
)
insert into public.sale_invoice_cancel_snapshots (invoice_id, total_amount, discount, devices, products)
select c.id,
       greatest(0, coalesce(dj.total, 0) + coalesce(pj.total, 0) - c.discount),
       c.discount,
       coalesce(dj.devices, '[]'::jsonb),
       coalesce(pj.products, '[]'::jsonb)
from cancelled c
left join dev_json dj on dj.invoice_id = c.id
left join prd_json pj on pj.invoice_id = c.id
where dj.invoice_id is not null or pj.invoice_id is not null
on conflict (invoice_id) do nothing;

-- Report: which cancelled invoices were recovered
select si.invoice_number,
       (s.invoice_id is not null) as recovered,
       jsonb_array_length(coalesce(s.devices, '[]'::jsonb))  as devices,
       jsonb_array_length(coalesce(s.products, '[]'::jsonb)) as products,
       s.total_amount
from public.sale_invoices si
left join public.sale_invoice_cancel_snapshots s on s.invoice_id = si.id
where si.status = 'cancelled'
order by si.invoice_number;
