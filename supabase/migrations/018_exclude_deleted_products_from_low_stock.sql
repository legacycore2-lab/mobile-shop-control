-- ══════════════════════════════════════════════════════════════════════════════
-- Migration 018: استبعاد المنتجات المحذوفة من تنبيهات المخزون المنخفض
-- ══════════════════════════════════════════════════════════════════════════════
-- المنتجات المحذوفة (soft delete) كانت بتتعد في "مخزون منخفض" وبتظهر في التنبيهات.

alter table public.products
  add column if not exists is_deleted boolean not null default false;

create or replace function public.get_low_stock_products()
returns table (
  product_id    uuid,
  product_name  text,
  stock_qty     integer,
  reorder_level integer,
  category_name text
)
language sql stable as $$
  select p.id, p.name, p.stock_qty, p.reorder_level, c.name
  from public.products p
  join public.product_categories c on c.id = p.category_id
  where p.is_active = true
    and p.is_deleted = false
    and p.stock_qty <= p.reorder_level
  order by p.stock_qty asc;
$$;
