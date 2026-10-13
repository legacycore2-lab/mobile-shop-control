-- 038_number_visibility_permissions.sql
-- صلاحيات ظهور الأرقام الحساسة لكل دور (عرض فقط)
insert into public.role_permissions (role, resource, can_view, can_create, can_edit, can_delete)
select r.role, n.resource,
       r.role in ('owner', 'manager'), false, false, false
from (values ('owner'), ('manager'), ('cashier'), ('warehouse')) as r(role)
cross join (values ('num_cost'), ('num_profit'), ('num_revenue'), ('num_balances')) as n(resource)
on conflict (role, resource) do nothing;
