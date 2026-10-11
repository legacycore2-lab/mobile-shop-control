-- 025_catalog_order_delivery.sql
-- ربط طلب الكتالوج بفاتورة البيع والمبلغ المستلم عند التسليم

alter table public.catalog_orders
  add column if not exists sale_invoice_id uuid references public.sale_invoices(id) on delete set null,
  add column if not exists paid_amount     numeric(12,2) not null default 0;
