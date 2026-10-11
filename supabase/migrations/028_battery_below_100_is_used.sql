-- 028_battery_below_100_is_used.sql
-- أي آيفون "جديد" نسبة بطاريته أقل من 100% يبقى "مستعمل" (تصحيح البيانات الحالية + قاعدة دائمة).
-- للآيفون بس؛ باقي الماركات والمجدد (refurbished) زي ما هم.

create or replace function public._is_iphone_model(p_model_id uuid)
returns boolean language sql stable as $$
  select exists (
    select 1
    from public.mobile_models m
    join public.mobile_brands b on b.id = m.brand_id
    where m.id = p_model_id
      and (b.name ilike '%apple%' or b.name ilike '%iphone%'
        or b.name ilike '%ايفون%' or b.name ilike '%آيفون%'
        or b.name ilike '%ابل%'   or b.name ilike '%أبل%')
  );
$$;

create or replace function public._battery_below_100_is_used()
returns trigger language plpgsql as $$
begin
  if new.condition = 'new' and new.battery_health is not null and new.battery_health < 100
     and public._is_iphone_model(new.model_id) then
    new.condition := 'used';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_battery_below_100_is_used on public.mobile_devices;
create trigger trg_battery_below_100_is_used
  before insert or update of condition, battery_health, model_id on public.mobile_devices
  for each row execute function public._battery_below_100_is_used();

-- تصحيح الآيفونات الموجودة
update public.mobile_devices d
set condition = 'used'
where d.condition = 'new' and d.battery_health is not null and d.battery_health < 100
  and public._is_iphone_model(d.model_id);
