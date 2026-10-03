-- Migration 010: Allow buying back a device that was already sold
-- ─────────────────────────────────────────────────────────────────────────────
-- Problem
--   mobile_devices.imei1 was UNIQUE for all rows (migration 001). A phone that was
--   bought, sold, and later bought back from the customer could not be registered
--   again: the old row (status = 'sold') still owned the IMEI.
--
-- Solution
--   * Each purchase cycle is its own mobile_devices row, so cost, sale price and
--     profit of the earlier sale stay untouched in reports.
--   * IMEI1 stays unique among devices that are NOT sold, so the same phone can
--     never be in stock twice.
--   * lookup_device_by_imei returns the newest row first.

-- ── 1. Replace the global unique constraint with a partial unique index ──────
alter table public.mobile_devices
  drop constraint if exists mobile_devices_imei1_key;

create unique index if not exists mobile_devices_imei1_active_key
  on public.mobile_devices (imei1)
  where status <> 'sold';

-- ── 2. Lookups must prefer the latest purchase cycle of an IMEI ──────────────
create or replace function public.lookup_device_by_imei(p_imei text)
returns setof public.mobile_devices_view
language sql stable as $$
  select * from public.mobile_devices_view
  where imei1 = p_imei or imei2 = p_imei
  order by created_at desc
  limit 5;
$$;
