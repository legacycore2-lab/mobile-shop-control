-- Migration 015: give every product without SKU/barcode an automatic code
-- ─────────────────────────────────────────────────────────────────────────
-- Products created without a barcode or SKU cannot be scanned from a QR label.
-- New products now get a PRD-xxxx code from the app; this backfills old ones.

update public.products
   set sku = 'PRD-' || upper(substr(md5(id::text), 1, 8))
 where coalesce(trim(sku), '') = ''
   and coalesce(trim(barcode), '') = '';
