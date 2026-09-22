-- Migration 008: Allow 'cancelled' as a valid mobile_devices.status value
-- ─────────────────────────────────────────────────────────────────────────
-- The original CHECK constraint on mobile_devices.status (migration 001)
-- only allowed: in_stock, sold, returned, defective, sent_to_repair.
-- cancel_purchase_invoice() (migration 007) sets status = 'cancelled' when
-- reversing a confirmed purchase, and several repository queries
-- (pos.repository.ts, purchases.repository.ts) already filter on
-- status = 'cancelled'. The constraint was never updated to match,
-- causing every cancellation of a confirmed purchase invoice to fail
-- with a 400 (check_violation) from PostgREST.

alter table public.mobile_devices
  drop constraint if exists mobile_devices_status_check;

alter table public.mobile_devices
  add constraint mobile_devices_status_check
  check (status in ('in_stock','sold','returned','defective','sent_to_repair','cancelled'));
