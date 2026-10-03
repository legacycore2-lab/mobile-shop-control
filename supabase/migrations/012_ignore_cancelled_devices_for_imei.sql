-- Migration 012: A device whose purchase was cancelled must not hold its IMEI
-- ─────────────────────────────────────────────────────────────────────────────
-- Cancelling a purchase invoice sets its devices to status = 'cancelled'
-- (cancel_purchase_invoice, migration 007). Those rows are not real stock, so:
--   1. They must not block registering the same IMEI again.
--   2. The "previously sold" lookup must skip them and find the last real cycle.

-- ── 1. Unique IMEIs only among devices that are neither sold nor cancelled ───
drop index if exists public.mobile_devices_imei1_active_key;
create unique index mobile_devices_imei1_active_key
  on public.mobile_devices (imei1)
  where status not in ('sold', 'cancelled');

drop index if exists public.mobile_devices_imei2_active_key;
create unique index mobile_devices_imei2_active_key
  on public.mobile_devices (imei2)
  where imei2 is not null and status not in ('sold', 'cancelled');

-- ── 2. Lookup order: live device first, then latest sold, then cancelled ─────
create or replace function public.lookup_device_by_imei(p_imei text)
returns setof public.mobile_devices_view
language sql stable as $$
  select * from public.mobile_devices_view
  where imei1 = p_imei or imei2 = p_imei
  order by (status in ('sold', 'cancelled')), (status = 'cancelled'), created_at desc
  limit 5;
$$;
