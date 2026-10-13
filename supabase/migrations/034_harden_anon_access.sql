-- 034: إغلاق وصول anon (الزوار) لكل شيء ما عدا دوال الكتالوج العامة

-- 1) الفيوهات كانت بتشتغل بصلاحيات المالك وبتتخطى RLS (كانت بتكشف الأجهزة وسعر التكلفة والـ IMEI والعملاء)
alter view public.mobile_devices_view set (security_invoker = true);
alter view public.profiles_public     set (security_invoker = true);

-- 2) anon مالوش أي وصول مباشر للجداول/الفيوهات/السيكوينسز (الكتالوج بيشتغل عن طريق RPC بس)
revoke all on all tables    in schema public from anon;
revoke all on all sequences in schema public from anon;

-- 3) الدوال: شيل التنفيذ من الزوار، وارجّعه بس لدوال الكتالوج العامة الخمسة
revoke execute on all functions in schema public from public, anon;

grant execute on function public.get_public_catalog()                             to anon;
grant execute on function public.create_catalog_order(text, text, text, jsonb)   to anon;
grant execute on function public.track_catalog_order(text, text)                 to anon;
grant execute on function public.submit_catalog_review(text, text, integer, text) to anon;
grant execute on function public.log_catalog_event(text, text, text)             to anon;

-- 4) دوال الـ trigger مش محتاجة تتنادي من الـ API خالص
do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prokind = 'f' and p.prorettype = 'trigger'::regtype
  loop
    execute format('revoke execute on function %s from authenticated', r.sig);
  end loop;
end $$;

-- 5) ثبّت search_path لكل دوال public اللي ناقصها (يمنع اختطاف الدوال SECURITY DEFINER)
do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prokind = 'f'
      and (p.proconfig is null
           or not exists (select 1 from unnest(p.proconfig) c where c like 'search_path=%'))
  loop
    execute format('alter function %s set search_path = public, pg_temp', r.sig);
  end loop;
end $$;
