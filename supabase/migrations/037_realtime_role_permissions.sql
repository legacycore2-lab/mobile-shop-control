-- 037_realtime_role_permissions.sql
-- تحديث الصلاحيات لحظياً عند كل المستخدمين
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'role_permissions'
  ) then
    alter publication supabase_realtime add table public.role_permissions;
  end if;
end $$;
