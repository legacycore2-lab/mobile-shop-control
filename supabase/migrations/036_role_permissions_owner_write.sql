-- 036_role_permissions_owner_write.sql
-- تعديل الصلاحيات للمالك فقط، والقراءة لأي مستخدم مسجل دخول (الواجهة محتاجاها)

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'role_permissions' and policyname = 'role_permissions_read'
  ) then
    create policy role_permissions_read on public.role_permissions
      for select to authenticated using (true);
  end if;
end $$;

alter policy auth_role_permissions on public.role_permissions
  to authenticated
  using (public."current_role"() = 'owner')
  with check (public."current_role"() = 'owner');
