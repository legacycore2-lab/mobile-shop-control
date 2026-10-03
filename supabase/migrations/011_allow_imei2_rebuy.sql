-- Migration 011: Same rule as 010, for IMEI2
-- ─────────────────────────────────────────────────────────────────────────────
-- A unique rule named mobile_devices_imei2_key existed in the live database
-- (created outside the migration files). If it applies to every row, buying back
-- a sold dual-SIM phone is rejected on its IMEI2 even after migration 010.
-- IMEI2 becomes unique only among devices that are NOT sold.

-- The old rule may be a constraint or a plain unique index — drop whichever it is.
alter table public.mobile_devices
  drop constraint if exists mobile_devices_imei2_key;

drop index if exists public.mobile_devices_imei2_key;

create unique index if not exists mobile_devices_imei2_active_key
  on public.mobile_devices (imei2)
  where imei2 is not null and status <> 'sold';
