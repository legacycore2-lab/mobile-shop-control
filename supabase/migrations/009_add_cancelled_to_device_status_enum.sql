-- Migration 009: Add 'cancelled' to the device_status enum
-- ─────────────────────────────────────────────────────────────────────────
-- mobile_devices.status is backed by the enum type `device_status`
-- (not a text + CHECK constraint as migration 001 in this repo suggests —
-- the live database's enum predates/overrides that file).
-- cancel_purchase_invoice() (migration 007) sets status = 'cancelled' when
-- reversing a confirmed purchase, but 'cancelled' was never a member of the
-- enum, so Postgres rejected the value at input-parsing time (22P02) before
-- any check constraint was even evaluated. Migration 008 (CHECK-constraint
-- based) was a no-op against an enum column — this migration is the actual
-- fix.
--
-- NOTE: run this statement alone (its own query/transaction). A newly added
-- enum value cannot be used in the same transaction that adds it.

alter type public.device_status add value if not exists 'cancelled';
