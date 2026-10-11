-- 028_battery_below_100_is_used.sql
-- أي جهاز "جديد" نسبة بطاريته أقل من 100% يبقى "مستعمل" (تصحيح البيانات الحالية + قاعدة دائمة).
-- بنغيّر الجديد بس؛ المجدد (refurbished) بيفضل زي ما هو.

create or replace function public._battery_below_100_is_used()
returns trigger language plpgsql as $$
begin
  if new.condition = 'new' and new.battery_health is not null and new.battery_health < 100 then
    new.condition := 'used';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_battery_below_100_is_used on public.mobile_devices;
create trigger trg_battery_below_100_is_used
  before insert or update of condition, battery_health on public.mobile_devices
  for each row execute function public._battery_below_100_is_used();

-- تصحيح الأجهزة الموجودة
update public.mobile_devices
set condition = 'used'
where condition = 'new' and battery_health is not null and battery_health < 100;
