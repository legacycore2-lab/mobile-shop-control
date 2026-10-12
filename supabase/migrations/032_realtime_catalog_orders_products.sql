-- 032: تفعيل Realtime لكل الجداول اللي src/lib/realtime.ts بيراقبها
do $$
declare
  t text;
begin
  foreach t in array array[
    'catalog_orders', 'products', 'mobile_devices', 'purchase_invoices',
    'purchase_invoice_devices', 'purchase_invoice_products', 'sale_invoices',
    'sale_invoice_devices', 'sale_invoice_products', 'payments',
    'product_categories', 'suppliers', 'customers', 'mobile_brands',
    'mobile_models', 'expenses'
  ] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
